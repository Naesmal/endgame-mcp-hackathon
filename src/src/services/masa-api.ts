import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { API_ENDPOINTS } from '../constants/endpoints';
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
import { objectToURLParams } from '../utils/helpers';

/**
 * Implémentation du service Masa utilisant l'API officielle
 */
export class MasaApiService implements MasaService {
  private client: AxiosInstance;
  
  constructor() {
    // Créer un client axios avec la configuration de base
    this.client = axios.create({
      baseURL: env.MASA_API_BASE_URL,
      headers: {
        'Authorization': `Bearer ${env.MASA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 secondes
    });
    
    // Ajouter un intercepteur pour les logs
    this.client.interceptors.request.use(request => {
      logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.baseURL}${request.url}`);
      return request;
    });
    
    this.client.interceptors.response.use(
      response => {
        logger.debug(`API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        if (error.response) {
          logger.error(`API Error: ${error.response.status} ${error.response.statusText}`);
          // Ne pas logguer les détails complets de l'erreur, juste un résumé
          logger.debug(`API Error Message: ${error.message}`);
        } else {
          logger.error(`API Request Failed: ${error.message}`);
        }
        // Important: retourner une erreur propre pour être correctement traitée par MCP
        return Promise.reject(new Error(`Request failed: ${error.message}`));
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
      const response = await this.client.post(API_ENDPOINTS.TWITTER.SEARCH, request);
      return response.data;
    } catch (error) {
      logger.error('Error searching Twitter:', error);
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
    try {
      const response = await this.client.get(`${API_ENDPOINTS.TWITTER.STATUS}/${jobId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error checking Twitter search status for job ${jobId}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les résultats d'une recherche Twitter
   * @param jobId ID du job de recherche
   * @returns Résultats de la recherche
   */
  async getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    try {
      const response = await this.client.get(`${API_ENDPOINTS.TWITTER.RESULT}/${jobId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting Twitter search results for job ${jobId}:`, error);
      throw error;
    }
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
      
      // Créer une copie modifiée de la requête
      const modifiedRequest = {
        ...request,
        namespace: namespace
      };
      
      const response = await this.client.post(API_ENDPOINTS.DATA.INDEX, modifiedRequest);
      return response.data;
    } catch (error) {
      logger.error('Error indexing data:', error);
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
      
      // Créer une copie modifiée de la requête
      const modifiedRequest = {
        ...request,
        namespace: namespace
      };
      
      const response = await this.client.post(API_ENDPOINTS.DATA.QUERY, modifiedRequest);
      return response.data;
    } catch (error) {
      logger.error('Error querying data:', error);
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
    try {
      const response = await this.client.get(`${API_ENDPOINTS.DATA.STATUS}/${jobId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error checking data index status for job ${jobId}:`, error);
      throw error;
    }
  }
}