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
  DataQueryResult,
  // Nouveaux types
  WebScrapeRequest,
  WebScrapeResult,
  TermExtractionRequest,
  TermExtractionResult,
  DataAnalysisRequest,
  DataAnalysisResult,
  SimilaritySearchRequest,
  SimilaritySearchResult
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
  
  // Méthodes existantes - améliorées pour gestion correcte du workflow
  async searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult> {
    try {
      // Préparer la requête au format EXACT attendu par l'API
      const apiRequest = {
        query: request.query,
        type: "searchbyquery", // Type est requis par l'API
        max_results: request.count || 10
      };
      
      logger.info(`Initiating Twitter search for query: ${request.query}`);
      const response = await this.client.post(API_ENDPOINTS.TWITTER.SEARCH, apiRequest);
      
      // Vérifier si la réponse contient le format attendu (uuid)
      if (!response.data || !response.data.uuid) {
        throw new Error('Invalid response format: missing uuid');
      }
      
      // L'API renvoie un UUID dans la réponse
      const jobId = response.data.uuid;
      logger.info(`Twitter search job created with ID: ${jobId}`);
      
      // Renvoyer l'ID du job pour permettre la vérification du statut
      return {
        id: jobId,
        data: [], // Les données seront récupérées ultérieurement
        pending: true // Indiquer que la recherche est en cours
      };
    } catch (error) {
      logger.error('Error searching Twitter:', error);
      // Propager l'erreur avec plus de détails pour faciliter le débogage
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const message = error.response?.data?.error || error.message;
        throw new Error(`Twitter search failed with status ${status}: ${message}`);
      }
      throw error;
    }
  }
  
  async checkTwitterSearchStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    try {
      logger.info(`Checking Twitter search status for job ${jobId}`);
      const response = await this.client.get(`${API_ENDPOINTS.TWITTER.STATUS}/${jobId}`);
      
      // Vérifier si la réponse contient le format attendu (status)
      if (!response.data || !response.data.status) {
        throw new Error('Invalid response format: missing status');
      }
      
      // Mapper les statuts de l'API vers notre interface interne
      const apiStatus = response.data.status.toLowerCase();
      let status: 'pending' | 'completed' | 'failed';
      
      if (apiStatus === 'done') {
        status = 'completed';
      } else if (apiStatus.includes('error')) {
        status = 'failed';
      } else if (apiStatus === 'processing' || apiStatus === 'in progress') {
        // Gérer explicitement le cas "in progress" mentionné dans la doc
        status = 'pending';
      } else {
        // Par défaut, traiter toute autre valeur comme pending
        logger.warn(`Unknown API status received: ${apiStatus}, defaulting to 'pending'`);
        status = 'pending';
      }
      
      logger.debug(`Twitter search status for job ${jobId}: ${status}`);
      return {
        status,
        message: response.data.error || undefined
      };
    } catch (error) {
      logger.error(`Error checking Twitter search status for job ${jobId}:`, error);
      // Propager l'erreur avec plus de détails pour faciliter le débogage
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const message = error.response?.data?.error || error.message;
        throw new Error(`Status check failed with status ${status}: ${message}`);
      }
      throw error;
    }
  }
  
  async getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    try {
      logger.info(`Getting Twitter search results for job ${jobId}`);
      const response = await this.client.get(`${API_ENDPOINTS.TWITTER.RESULT}/${jobId}`);
      
      // La documentation indique que l'API renvoie un tableau d'objets (results)
      // mais dans votre exemple, il semble que ce soit directement un tableau
      const tweetData = Array.isArray(response.data) ? response.data : 
                      (response.data.results ? response.data.results : []);
      
      if (!Array.isArray(tweetData)) {
        logger.warn(`Unexpected response format from API for job ${jobId}: ${JSON.stringify(response.data)}`);
        throw new Error(`Invalid response format from API: expected array, got ${typeof tweetData}`);
      }
      
      // Journaliser la structure des données reçues pour faciliter le débogage
      if (tweetData.length > 0) {
        logger.debug(`Example tweet data format: ${JSON.stringify(tweetData[0])}`);
      } else {
        logger.debug(`No tweets found for job ${jobId}`);
      }
      
      // Adapter le format de l'API à notre interface
      // Basé sur la structure exacte que l'API renvoie (exemple dans la doc)
      const processedData = tweetData.map(tweet => {
        // Déterminer si nous avons déjà un format compatible ou si nous devons le transformer
        if (tweet.Tweet) {
          return tweet; // Déjà au format compatible
        }
        
        // Extraction des données depuis le format API
        return {
          Tweet: {
            ID: tweet.ID || tweet.id,
            ExternalID: tweet.ExternalID || tweet.id?.toString(),
            Text: tweet.Content || tweet.text,
            Username: tweet.Metadata?.username || tweet.username || 'unknown',
            CreatedAt: tweet.Metadata?.created_at || tweet.created_at || new Date().toISOString(),
            LikeCount: tweet.Metadata?.public_metrics?.LikeCount || tweet.like_count,
            RetweetCount: tweet.Metadata?.public_metrics?.RetweetCount || tweet.retweet_count
          }
        };
      });
      
      return {
        id: jobId,
        data: processedData,
        pending: false
      };
    } catch (error) {
      logger.error(`Error getting Twitter search results for job ${jobId}:`, error);
      
      // Propager l'erreur avec plus de détails pour faciliter le débogage
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'unknown';
        const message = error.response?.data?.error || error.message;
        throw new Error(`Results retrieval failed with status ${status}: ${message}`);
      }
      
      throw error;
    }
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
  
  // Nouvelles méthodes
  
  /**
   * Scrape une page web pour extraire son contenu
   * @param request Paramètres de scraping
   * @returns Résultat du scraping
   */
  async scrapeWeb(request: WebScrapeRequest): Promise<WebScrapeResult> {
    try {
      logger.info(`Scraping web page: ${request.url}`);
      
      const payload = {
        url: request.url,
        format: request.format || 'text'
      };
      
      const response = await this.client.post(API_ENDPOINTS.WEB.SCRAPE, payload);
      
      return {
        title: response.data.title || response.data.metadata?.title || 'Web Page Content',
        content: response.data.content || '',
        url: response.data.url || request.url,
        metadata: response.data.metadata || {}
      };
    } catch (error) {
      logger.error(`Error scraping web page ${request.url}:`, error);
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
    try {
      logger.info(`Extracting search terms from: ${request.userInput}`);
      
      const response = await this.client.post(API_ENDPOINTS.ANALYSIS.TERMS_EXTRACTION, {
        userInput: request.userInput
      });
      
      // Adapter le format de l'API à notre interface
      // L'API retourne un seul terme, mais notre interface attend un tableau
      const searchTerms = [response.data.searchTerm];
      
      return {
        searchTerms,
        thinking: response.data.thinking
      };
    } catch (error) {
      logger.error('Error extracting search terms:', error);
      return {
        searchTerms: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Analyser des tweets avec un prompt personnalisé
   * @param request Tweets et prompt d'analyse
   * @returns Résultat de l'analyse
   */
  async analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResult> {
    try {
      logger.info(`Analyzing data with prompt: ${request.prompt}`);
      
      // Préparer les tweets au format attendu par l'API
      const tweetsText = Array.isArray(request.tweets) 
        ? request.tweets.join('\n') 
        : request.tweets;
      
      const response = await this.client.post(API_ENDPOINTS.ANALYSIS.DATA_ANALYSIS, {
        tweets: tweetsText,
        prompt: request.prompt
      });
      
      return {
        result: response.data.result
      };
    } catch (error) {
      logger.error('Error analyzing data:', error);
      return {
        result: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Recherche par similarité sémantique
   * @param request Paramètres de recherche
   * @returns Résultats de la recherche
   */
  async searchBySimilarity(request: SimilaritySearchRequest): Promise<SimilaritySearchResult> {
    try {
      logger.info(`Searching by similarity: ${request.query}`);
      
      // Vérifier le namespace (par défaut = twitter)
      const namespace = request.namespace?.toLowerCase() === 'bittensor'
        ? 'bittensor'
        : 'twitter';
      
      const response = await this.client.post(API_ENDPOINTS.ANALYSIS.SIMILARITY, {
        query: request.query,
        keywords: request.keywords || [],
        max_results: request.maxResults || 10,
        namespace: namespace
      });
      
      // Adapter le format de la réponse à notre interface
      return {
        results: response.data.results,
        total: response.data.results.length
      };
    } catch (error) {
      logger.error('Error searching by similarity:', error);
      return {
        results: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}