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
  DataQueryResult,
  // Nouveaux types
  WebScrapeRequest,
  WebScrapeResult,
  TermExtractionRequest,
  TermExtractionResult,
  DataAnalysisRequest,
  DataAnalysisResult,
  SimilaritySearchRequest,
  SimilaritySearchResult,
  TwitterData
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
  
  // Méthodes existantes - conservées telles quelles
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
  
  async getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    // Le protocole actuel ne stocke pas les résultats pour récupération ultérieure
    // Nous retournons un résultat vide avec une erreur explicative
    logger.warn(`Protocol does not support retrieving past search results. Job ID: ${jobId}`);
    
    return {
      id: jobId,
      error: 'Protocol does not support retrieving past search results. Please perform a new search.'
    };
  }
  
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
  
  // Nouvelles méthodes
  
  /**
   * Scrape une page web pour extraire son contenu
   * @param request Paramètres de scraping
   * @returns Résultat du scraping
   */
  async scrapeWeb(request: WebScrapeRequest): Promise<WebScrapeResult> {
    try {
      logger.info(`Scraping web page via protocol: ${request.url}`);
      
      // Construire la requête pour l'endpoint du Protocol
      const response = await this.client.post(PROTOCOL_ENDPOINTS.WEB.SCRAPE, {
        url: request.url,
        depth: request.depth || 1
      });
      
      // Journaliser la réponse brute pour débogage
      logger.debug(`Protocol web scrape raw response: ${JSON.stringify(response.data)}`);
      
      // En mode Protocol, on renvoie directement la réponse telle quelle
      // pour que l'outil puisse la traiter correctement
      return response.data;
    } catch (error) {
      logger.error(`Error scraping web page via protocol ${request.url}:`, error);
      return {
        url: request.url,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Extraire des termes de recherche à partir d'un prompt utilisateur (via IA)
   * @param request Prompt utilisateur
   * @returns Termes de recherche générés
   */
  async extractSearchTerms(request: TermExtractionRequest): Promise<TermExtractionResult> {
    // Le protocole ne supporte pas directement l'extraction de termes
    // Nous implémentons une solution de base pour respecter l'interface
    logger.warn('Term extraction not directly supported by protocol. Using fallback implementation.');
    
    // Extraction basique de mots-clés à partir du texte
    const userInput = request.userInput.toLowerCase();
    const stopWords = ['and', 'the', 'a', 'an', 'in', 'on', 'of', 'to', 'for', 'with', 'about'];
    
    // Diviser en mots et filtrer les stop words
    const words = userInput.split(/\s+/).filter(word => 
      word.length > 3 && !stopWords.includes(word)
    );
    
    // Extraire les mots les plus importants (longueur ou fréquence)
    const wordFrequency = new Map<string, number>();
    words.forEach(word => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });
    
    // Trier par fréquence et prendre les premiers
    const sortedWords = [...wordFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Limiter le nombre de termes retournés
    const count = request.count || 3;
    const searchTerms = sortedWords.slice(0, count);
    
    return {
      searchTerms,
      thinking: 'Extracted keywords based on frequency and relevance'
    };
  }
  
  /**
   * Analyser des tweets avec un prompt personnalisé
   * @param request Tweets et prompt d'analyse
   * @returns Résultat de l'analyse
   */
  async analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResult> {
    // Le protocole ne supporte pas directement l'analyse de données
    logger.warn('Data analysis not supported by protocol. Falling back to basic analysis');
    
    // Implémentation de base pour respecter l'interface
    const tweets = Array.isArray(request.tweets) ? request.tweets : [request.tweets];
    
    // Analyse très basique (juste pour compatibilité)
    let analysisResult = "Analysis not available in protocol mode. ";
    
    // Ajouter quelques statistiques basiques
    if (tweets.length > 0) {
      analysisResult += `Found ${tweets.length} tweets with a total of ${tweets.reduce((acc, tweet) => acc + tweet.length, 0)} characters.`;
    }
    
    return {
      result: analysisResult
    };
  }
  
  /**
   * Recherche par similarité sémantique
   * @param request Paramètres de recherche
   * @returns Résultats de la recherche
   */
  async searchBySimilarity(request: SimilaritySearchRequest): Promise<SimilaritySearchResult> {
    // Le protocole ne supporte pas directement la recherche par similarité
    logger.warn('Similarity search not supported by protocol. Falling back to regular search');
    
    try {
      // Utiliser l'API normale de recherche comme solution de repli
      const searchResponse = await this.client.post(PROTOCOL_ENDPOINTS.TWITTER.SEARCH, {
        query: request.query,
        count: request.maxResults || 10
      });
      
      // Adapter la réponse pour simuler une recherche par similarité
      const results = (searchResponse.data.data || [])
        .filter((item: TwitterData) => item.Tweet)
        .map((item: TwitterData) => ({
          id: item.Tweet?.ID || '',
          text: item.Tweet?.Text || '',
          similarity: 1.0, // Valeur fictive de similarité
          username: item.Tweet?.Username || '',
          date: item.Tweet?.CreatedAt || ''
        }));
      
      return {
        results,
        total: results.length
      };
    } catch (error) {
      logger.error('Error in fallback similarity search:', error);
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}