import { env, isBittensorEnabled } from '../config/env';
import logger from '../utils/logger';
import {
  BittensorSubnetInfo,
  BittensorNodeInfo,
  BittensorValidatorInfo,
  BittensorNeuronInfo,
  BittensorNetworkStats
} from '../types';

/**
 * Interface pour le service Bittensor
 * Cette interface définit les méthodes liées aux données Bittensor
 */
export interface BittensorService {
  /**
   * Récupère les informations d'un sous-réseau Bittensor
   * @param netuid ID du sous-réseau (optionnel, si non fourni, retourne tous les sous-réseaux)
   * @returns Informations du sous-réseau
   */
  getSubnetInfo(netuid?: number): Promise<BittensorSubnetInfo | BittensorSubnetInfo[]>;
  
  /**
   * Récupère les informations des nœuds d'un sous-réseau Bittensor
   * @param netuid ID du sous-réseau
   * @param limit Nombre maximal de nœuds à retourner (optionnel, défaut: 100)
   * @param offset Décalage pour la pagination (optionnel, défaut: 0)
   * @returns Liste des nœuds
   */
  getSubnetNodes(netuid: number, limit?: number, offset?: number): Promise<BittensorNodeInfo[]>;
  
  /**
   * Récupère les informations d'un validateur Bittensor
   * @param hotkey Adresse du hotkey du validateur
   * @returns Informations du validateur
   */
  getValidatorInfo(hotkey: string): Promise<BittensorValidatorInfo>;
  
  /**
   * Récupère les informations d'un neurone Bittensor
   * @param hotkey Adresse du hotkey du neurone
   * @param netuid ID du sous-réseau (optionnel)
   * @returns Informations du neurone
   */
  getNeuronInfo(hotkey: string, netuid?: number): Promise<BittensorNeuronInfo>;
  
  /**
   * Récupère les statistiques globales du réseau Bittensor
   * @returns Statistiques du réseau
   */
  getNetworkStats(): Promise<BittensorNetworkStats>;
}

/**
 * Service de secours Bittensor pour quand Bittensor est désactivé
 */
class BittensorDisabledService implements BittensorService {
  constructor() {
    logger.info('Using BittensorDisabledService - Bittensor functionality is disabled');
  }

  async getSubnetInfo(): Promise<BittensorSubnetInfo[]> {
    throw new Error('Bittensor functionality is disabled. Add TAO_STAT_API_KEY to your .env file to enable it.');
  }

  async getSubnetNodes(): Promise<BittensorNodeInfo[]> {
    throw new Error('Bittensor functionality is disabled. Add TAO_STAT_API_KEY to your .env file to enable it.');
  }

  async getValidatorInfo(): Promise<BittensorValidatorInfo> {
    throw new Error('Bittensor functionality is disabled. Add TAO_STAT_API_KEY to your .env file to enable it.');
  }

  async getNeuronInfo(): Promise<BittensorNeuronInfo> {
    throw new Error('Bittensor functionality is disabled. Add TAO_STAT_API_KEY to your .env file to enable it.');
  }

  async getNetworkStats(): Promise<BittensorNetworkStats> {
    throw new Error('Bittensor functionality is disabled. Add TAO_STAT_API_KEY to your .env file to enable it.');
  }
}

/**
 * Fabrique pour le service Bittensor
 */
export class BittensorServiceFactory {
  /**
   * Crée une instance du service Bittensor
   * @returns Promise avec l'instance du service Bittensor
   */
  static async createService(): Promise<BittensorService> {
    // Vérifier si la fonctionnalité Bittensor est activée
    if (!isBittensorEnabled()) {
      return new BittensorDisabledService();
    }

    try {
      // Vérifier si la clé TAO_STAT_API_KEY est définie
      if (!env.TAO_STAT_API_KEY) {
        logger.error('TAO_STAT_API_KEY is required for Bittensor functionality');
        return new BittensorDisabledService();
      }

      const { BittensorApiService } = await import('./bittensor-api.js');
      return new BittensorApiService();
    } catch (error) {
      logger.error('Failed to create BittensorApiService:', error);
      return new BittensorDisabledService();
    }
  }
}