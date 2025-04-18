import axios from 'axios';
import logger from './logger';

/**
 * Gestionnaire de limites de taux pour l'API Masa
 * Cette classe permet de respecter la limite de 3 requêtes par seconde imposée par l'API
 */
class RateLimitHandler {
    private requestQueue: Array<{
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      executor: () => Promise<any>;
    }> = [];
    
    private processing = false;
    private requestCount = 0;
    private lastResetTime = Date.now();
    private readonly MAX_REQUESTS_PER_WINDOW = 3; // 3 requêtes maximum
    private readonly WINDOW_SIZE_MS = 1000; // Fenêtre de 1 seconde
    
    /**
     * Exécute une requête en respectant les limites de taux
     * @param executor Fonction exécutant la requête API
     * @returns Résultat de la requête
     */
    async executeWithRateLimit<T>(executor: () => Promise<T>): Promise<T> {
      // Si aucune requête n'est en cours de traitement, essayer d'exécuter celle-ci immédiatement
      if (!this.processing) {
        this.processing = true;
        try {
          return await this.executeWhenAllowed(executor);
        } finally {
          this.processing = false;
          // S'il y a des requêtes en attente, traiter la suivante
          this.processNextRequest();
        }
      }
      
      // Sinon, ajouter la requête à la file d'attente
      return new Promise<T>((resolve, reject) => {
        this.requestQueue.push({
          resolve,
          reject,
          executor
        });
      });
    }
    
    /**
     * Exécute une requête lorsque les limites de taux le permettent
     */
    private async executeWhenAllowed<T>(executor: () => Promise<T>): Promise<T> {
      const now = Date.now();
      
      // Réinitialiser le compteur si une seconde s'est écoulée depuis la dernière réinitialisation
      if (now - this.lastResetTime >= this.WINDOW_SIZE_MS) {
        this.requestCount = 0;
        this.lastResetTime = now;
      }
      
      // Si le nombre maximum de requêtes est atteint, attendre jusqu'à la prochaine fenêtre
      if (this.requestCount >= this.MAX_REQUESTS_PER_WINDOW) {
        const waitTime = this.WINDOW_SIZE_MS - (now - this.lastResetTime);
        if (waitTime > 0) {
          logger.debug(`Rate limit reached, waiting ${waitTime}ms before next request`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          // Réinitialiser pour la nouvelle fenêtre
          this.requestCount = 0;
          this.lastResetTime = Date.now();
        }
      }
      
      // Incrémenter le compteur et exécuter la requête
      this.requestCount++;
      try {
        return await executor();
      } catch (error: unknown) {
        // Si l'erreur est liée aux limites de taux (429), attendre et réessayer
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          logger.warn('Rate limit exceeded (429), retrying with backoff...');
          
          // Attendre avec un backoff (délai plus long)
          const retryAfter = parseInt(error.response.headers['retry-after'] || '2', 10);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          
          // Réinitialiser le compteur et réessayer
          this.requestCount = 0;
          this.lastResetTime = Date.now();
          return this.executeWhenAllowed(executor);
        }
        
        // Propager les autres erreurs
        throw error;
      }
    }
    
    /**
     * Traite la prochaine requête dans la file d'attente
     */
    private processNextRequest(): void {
      if (this.requestQueue.length === 0) {
        return;
      }
      
      const { resolve, reject, executor } = this.requestQueue.shift()!;
      
      this.processing = true;
      this.executeWhenAllowed(executor)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          this.processing = false;
          this.processNextRequest();
        });
    }
  }
  
  // Exporter une instance singleton pour être utilisée globalement
  export const rateLimitHandler = new RateLimitHandler();