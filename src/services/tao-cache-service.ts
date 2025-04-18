// tao-cache-service.ts
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { env } from '../config/env';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Service de mise en cache pour l'API TaoStats
 * Permet de réduire considérablement les appels API en mettant en cache les résultats
 * et en implémentant un chargement paresseux (lazy loading)
 */
export class TaoStatsCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cachePath: string;
  private requestCounter: number = 0;
  private dailyRequestLimit: number = 5; // Limite gratuite par défaut
  private lastResetDay: number = new Date().getUTCDate();
  private persistentCacheEnabled: boolean = true;

  constructor(options?: {
    cachePath?: string;
    dailyRequestLimit?: number;
    persistentCacheEnabled?: boolean;
  }) {
    // Configurer le chemin du cache
    this.cachePath = options?.cachePath || path.join(process.cwd(), '.cache', 'tao-cache.json');
    // Configurer la limite quotidienne
    this.dailyRequestLimit = options?.dailyRequestLimit || 5;
    // Activer/désactiver le cache persistant
    this.persistentCacheEnabled = options?.persistentCacheEnabled !== false;
    
    // Initialiser le cache
    this.initializeCache();
    
    // Enregistrer l'état du cache à intervalle régulier
    setInterval(() => this.persistCache(), 5 * 60 * 1000); // Toutes les 5 minutes
    
    // Configurer l'arrêt propre
    process.on('SIGINT', () => {
      this.persistCache().then(() => {
        logger.info('TaoStats cache persisted before shutdown');
        process.exit(0);
      });
    });
  }

  /**
   * Initialise le cache depuis le stockage persistant
   */
  private async initializeCache(): Promise<void> {
    if (!this.persistentCacheEnabled) {
      logger.info('TaoStats persistent cache is disabled');
      return;
    }
    
    try {
      // Vérifier si le répertoire de cache existe
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });
      
      // Essayer de charger le cache existant
      try {
        const cacheData = await fs.readFile(this.cachePath, 'utf-8');
        const parsed = JSON.parse(cacheData);
        
        // Restaurer le compteur de requêtes
        this.requestCounter = parsed.requestCounter || 0;
        this.lastResetDay = parsed.lastResetDay || new Date().getUTCDate();
        
        // Vérifier si nous sommes un nouveau jour et réinitialiser le compteur si nécessaire
        const currentDay = new Date().getUTCDate();
        if (currentDay !== this.lastResetDay) {
          logger.info('New day detected, resetting TaoStats API request counter');
          this.requestCounter = 0;
          this.lastResetDay = currentDay;
        }
        
        // Restaurer les entrées du cache
        if (parsed.entries && Array.isArray(parsed.entries)) {
          for (const [key, value] of parsed.entries) {
            // Ne pas restaurer les entrées expirées
            if (value.expiresAt > Date.now()) {
              this.cache.set(key, value);
            }
          }
        }
        
        logger.info(`TaoStats cache loaded with ${this.cache.size} entries. Used ${this.requestCounter}/${this.dailyRequestLimit} API calls today.`);
      } catch (error) {
        // Si le fichier n'existe pas ou est invalide, créer un nouveau cache
        logger.info('No valid TaoStats cache found, creating a new one');
        await this.persistCache();
      }
    } catch (error) {
      logger.error('Failed to initialize TaoStats cache:', error);
    }
  }

  /**
   * Persiste le cache sur le disque
   */
  private async persistCache(): Promise<void> {
    if (!this.persistentCacheEnabled) {
      return;
    }
    
    try {
      const cacheDir = path.dirname(this.cachePath);
      await fs.mkdir(cacheDir, { recursive: true });
      
      const cacheData = {
        timestamp: Date.now(),
        requestCounter: this.requestCounter,
        lastResetDay: this.lastResetDay,
        entries: Array.from(this.cache.entries())
      };
      
      await fs.writeFile(this.cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      logger.debug(`TaoStats cache persisted with ${this.cache.size} entries`);
    } catch (error) {
      logger.error('Failed to persist TaoStats cache:', error);
    }
  }

  /**
   * Exécute une fonction avec mise en cache des résultats
   * 
   * @param key Clé de cache unique
   * @param fetchFn Fonction asynchrone qui fait l'appel API réel
   * @param options Options de cache
   * @returns Résultat de la fonction ou du cache
   */
  async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl?: number;             // Durée de vie en millisecondes
      forceRefresh?: boolean;   // Force l'actualisation même si en cache
      fallbackToCache?: boolean; // Utiliser le cache même expiré en cas d'erreur
      critical?: boolean;       // Indique si cette requête est critique (prioritaire)
      failSilently?: boolean;   // Ne pas lancer d'erreur en cas de limite atteinte
    } = {}
  ): Promise<T> {
    // Valeurs par défaut des options
    const ttl = options.ttl || 3600000; // 1 heure par défaut
    const forceRefresh = options.forceRefresh || false;
    const fallbackToCache = options.fallbackToCache !== false; // true par défaut
    const critical = options.critical || false;
    const failSilently = options.failSilently || false;
    
    // Gérer la réinitialisation du compteur quotidien
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      logger.info('New day detected, resetting TaoStats API request counter');
      this.requestCounter = 0;
      this.lastResetDay = currentDay;
    }
    
    try {
      // Vérifier si nous avons déjà une requête en cours pour cette clé
      const pendingRequest = this.pendingRequests.get(key);
      if (pendingRequest && !forceRefresh) {
        logger.debug(`Using pending request for key: ${key}`);
        return pendingRequest;
      }
      
      // Vérifier si nous avons une entrée en cache valide
      const cachedEntry = this.cache.get(key);
      if (cachedEntry && !forceRefresh && cachedEntry.expiresAt > Date.now()) {
        logger.debug(`Cache hit for key: ${key}`);
        return cachedEntry.data;
      }
      
      // Vérifier si nous avons atteint la limite d'appels API
      if (this.requestCounter >= this.dailyRequestLimit && !critical) {
        // Si nous avons une entrée en cache, même expirée, l'utiliser
        if (cachedEntry && fallbackToCache) {
          logger.warn(`API limit reached (${this.requestCounter}/${this.dailyRequestLimit}), using expired cache for: ${key}`);
          return cachedEntry.data;
        }
        
        // Sinon, lancer une erreur ou retourner null selon failSilently
        const message = `TaoStats API daily limit reached (${this.requestCounter}/${this.dailyRequestLimit})`;
        if (failSilently) {
          logger.warn(`${message}, returning null for: ${key}`);
          return null as any;
        } else {
          throw new Error(message);
        }
      }
      
      // Créer une requête et l'enregistrer comme en cours
      const fetchPromise = (async () => {
        try {
          // Incrémenter le compteur avant de faire la requête
          this.requestCounter++;
          
          // Faire la requête API réelle
          logger.info(`TaoStats API request (${this.requestCounter}/${this.dailyRequestLimit}) for: ${key}`);
          const result = await fetchFn();
          
          // Mettre à jour le cache
          const now = Date.now();
          this.cache.set(key, {
            data: result,
            timestamp: now,
            expiresAt: now + ttl
          });
          
          // Persister le cache après chaque nouveau résultat
          this.persistCache();
          
          return result;
        } catch (error) {
          // En cas d'erreur, décrémenter le compteur (sauf pour les erreurs 429)
          if (!(error instanceof Error && error.message.includes('429'))) {
            this.requestCounter--;
          }
          
          // Si une entrée en cache existe, l'utiliser même si expirée
          if (fallbackToCache && cachedEntry) {
            logger.warn(`Error fetching ${key}, falling back to cache:`, error);
            return cachedEntry.data;
          }
          
          // Sinon, propager l'erreur
          throw error;
        } finally {
          // Nettoyer la requête en cours
          this.pendingRequests.delete(key);
        }
      })();
      
      // Enregistrer la promesse pour éviter les requêtes dupliquées
      this.pendingRequests.set(key, fetchPromise);
      
      return fetchPromise;
    } catch (error) {
      logger.error(`Cache error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Obtient une statistique sur l'état actuel du cache
   */
  getCacheStats(): {
    size: number;
    apiCallsUsed: number;
    apiCallsRemaining: number;
    lastResetDay: number;
  } {
    return {
      size: this.cache.size,
      apiCallsUsed: this.requestCounter,
      apiCallsRemaining: Math.max(0, this.dailyRequestLimit - this.requestCounter),
      lastResetDay: this.lastResetDay
    };
  }

  /**
   * Efface une entrée spécifique du cache
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    logger.debug(`Cache entry invalidated: ${key}`);
  }

  /**
   * Efface toutes les entrées correspondant à un préfixe
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    logger.debug(`Invalidated ${count} cache entries with prefix: ${prefix}`);
    return count;
  }

  /**
   * Efface toutes les entrées du cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('TaoStats cache cleared');
  }
}

// Exporter une instance singleton
export const taoStatsCache = new TaoStatsCacheService({
  dailyRequestLimit: env.TAO_STAT_DAILY_LIMIT || 5
});