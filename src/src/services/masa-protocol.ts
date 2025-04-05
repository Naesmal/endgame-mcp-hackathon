import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { PROTOCOL_ENDPOINTS } from '../constants/endpoints';
import { MasaService } from './masa-service';
import {
  TwitterSearchRequest,
  TwitterSearchResult,
  DataIndexRequest,
  DataIndexResult,
  DataQueryRequest,
  DataQueryResult
} from '../types';
import logger from '../utils/logger';
import { generateId } from '../utils/helpers';

/**
 * Implémentation du service Masa utilisant le protocole direct
 */
export class MasaProtocolService implements MasaService {
  private client: AxiosInstance;
  
  constructor() {
    // Créer un client axios avec la configuration de base
    this.client = axios.create({
      baseURL: env.MASA_PROTOCOL_NODE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 secondes
    });
    
    // Ajouter un intercepteur pour les logs
    this.client.interceptors.request.use(request => {
      logger.debug(`Protocol Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
      return request;
    });
    
    this.client.interceptors.response.use(
      response => {
        logger.debug(`Protocol Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        if (error.response) {
          logger.error(`Protocol Error: ${error.response.status} ${error.response.statusText}`);
          logger.debug(`Protocol Error Details: ${JSON.stringify(error.response.data)}`);
        } else {
          logger.error(`Protocol Request Failed: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Recherche des tweets sur Twitter/X
   * @param request Paramètres de recherche
   * @returns Résultats de la recherche
   */
  async searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult> {
    try {
      const response = await this.client.post(PROTOCOL_ENDPOINTS.TWITTER.SEARCH, {
        query: request.query,
        count: request.count || 10
      });
      
      // Adapter la réponse au format attendu
      return {
        id: generateId('tw_search'),
        data: response.data.data || [],
        workerPeerId: response.data.workerPeerId
      };
    } catch (error) {
      logger.error('Error searching Twitter via protocol:', error);
      throw error;
    }
  }
  
  /**
   * Vérifie le statut d'une recherche Twitter
   * @param jobId ID du job de recherche
   * @returns Statut de la recherche
   */
  async checkTwitterSearchStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    // Le protocole actuel ne supporte pas directement la vérification de statut
    // Nous simulons une réponse complétée pour rester compatible avec l'interface
    logger.info(`Protocol does not support status checks directly. Simulating status for job ${jobId}`);
    
    return {
      status: 'completed',
      message: 'Protocol searches are processed synchronously'
    };
  }
  
  /**
   * Récupère les résultats d'une recherche Twitter
   * @param jobId ID du job de recherche
   * @returns Résultats de la recherche
   */
  async getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    // Le protocole actuel ne stocke pas les résultats pour récupération ultérieure
    // Nous retournons un résultat vide avec une erreur explicative
    logger.warn(`Protocol does not support retrieving past search results. Job ID: ${jobId}`);
    
    return {
      id: jobId,
      error: 'Protocol does not support retrieving past search results. Please perform a new search.'
    };
  }
  
  /**
   * Indexe des données dans le subnet
   * @param request Données à indexer
   * @returns Résultat de l'indexation
   */
  async indexData(request: DataIndexRequest): Promise<DataIndexResult> {
    try {
      // Valider le namespace (twitter ou bittensor)
      let namespace = 'twitter';
      
      if (request.namespace && request.namespace.toLowerCase() === 'bittensor') {
        namespace = 'bittensor';
      } else if (request.namespace && request.namespace.toLowerCase() !== 'twitter') {
        logger.warn(`Namespace override: requested '${request.namespace}' but using '${namespace}' for indexing`);
      }
      
      const response = await this.client.post(PROTOCOL_ENDPOINTS.DATA.INDEX, {
        data: request.data,
        metadata: request.metadata,
        namespace: namespace
      });
      
      return {
        id: response.data.id || generateId('data_index'),
        status: response.data.success ? 'success' : 'error',
        message: response.data.message
      };
    } catch (error) {
      logger.error('Error indexing data via protocol:', error);
      throw error;
    }
  }
  
  /**
   * Recherche des données dans le subnet
   * @param request Paramètres de recherche
   * @returns Résultats de la recherche
   */
  async queryData(request: DataQueryRequest): Promise<DataQueryResult> {
    try {
      // Valider le namespace (twitter ou bittensor)
      let namespace = 'twitter';
      
      if (request.namespace && request.namespace.toLowerCase() === 'bittensor') {
        namespace = 'bittensor';
      } else if (request.namespace && request.namespace.toLowerCase() !== 'twitter') {
        logger.warn(`Namespace override: requested '${request.namespace}' but using '${namespace}' for querying`);
      }
      
      const response = await this.client.post(PROTOCOL_ENDPOINTS.DATA.QUERY, {
        query: request.query,
        namespace: namespace,
        limit: request.limit || 10,
        offset: request.offset || 0
      });
      
      return {
        data: response.data.results || [],
        total: response.data.total || response.data.results?.length || 0,
        hasMore: response.data.hasMore || false
      };
    } catch (error) {
      logger.error('Error querying data via protocol:', error);
      throw error;
    }
  }
  
  /**
   * Vérifie le statut d'une indexation de données
   * @param jobId ID du job d'indexation
   * @returns Statut de l'indexation
   */
  async checkDataIndexStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    // Le protocole actuel ne supporte pas directement la vérification de statut
    // Nous simulons une réponse complétée pour rester compatible avec l'interface
    logger.info(`Protocol does not support index status checks directly. Simulating status for job ${jobId}`);
    
    return {
      status: 'completed',
      message: 'Protocol indexing is processed synchronously'
    };
  }
}