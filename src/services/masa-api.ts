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
  SimilaritySearchResult,
  TwitterData,
  RawTweetData 
} from '../types';
import logger from '../utils/logger';
import { rateLimitHandler } from '../utils/rate-limit-handler';

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
    return rateLimitHandler.executeWithRateLimit(async () => {
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
    });
  }
  
  /**
   * Vérifie le statut d'une recherche Twitter avec une meilleure gestion des erreurs et des réponses imprévues
   * @param jobId ID du job à vérifier
   * @returns Statut de la recherche Twitter
   */
  async checkTwitterSearchStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    return rateLimitHandler.executeWithRateLimit(async () => {
      try {
        if (!jobId || jobId.trim() === '') {
          throw new Error('Invalid job ID: empty or undefined');
        }
        
        logger.info(`Checking Twitter search status for job ${jobId}`);
        const response = await this.client.get(`${API_ENDPOINTS.TWITTER.STATUS}/${jobId}`);
        
        // Journaliser la réponse complète pour le débogage
        logger.debug(`Status response for job ${jobId}: ${JSON.stringify(response.data)}`);
        
        // Vérifier si la réponse contient le format attendu (status)
        if (!response.data) {
          logger.warn(`Empty response for status check of job ${jobId}`);
          return {
            status: 'pending',
            message: 'Empty response from status API, assuming job is still processing'
          };
        }
        
        // Essayer plusieurs propriétés possibles pour le statut
        let apiStatus = '';
        
        if (typeof response.data === 'string') {
          // La réponse est une chaîne de caractères directe
          apiStatus = response.data.toLowerCase();
        } else if (response.data.status) {
          // La réponse est un objet avec une propriété status
          apiStatus = String(response.data.status).toLowerCase();
        } else if (response.data.state) {
          // La réponse est un objet avec une propriété state
          apiStatus = String(response.data.state).toLowerCase();
        } else {
          // Aucun statut trouvé, utiliser un statut par défaut
          logger.warn(`No status found in response for job ${jobId}, defaulting to 'pending'`);
          apiStatus = 'pending';
        }
        
        logger.debug(`Extracted status for job ${jobId}: ${apiStatus}`);
        
        // Mapper les statuts de l'API vers notre interface interne
        let status: 'pending' | 'completed' | 'failed';
        
        if (apiStatus === 'done' || apiStatus === 'completed' || apiStatus === 'success') {
          status = 'completed';
        } else if (apiStatus.includes('error') || apiStatus.includes('fail') || apiStatus === 'failed') {
          status = 'failed';
        } else if (apiStatus === 'processing' || apiStatus === 'in progress' || apiStatus === 'pending' || apiStatus === 'waiting') {
          // Gérer explicitement les différents cas de traitement en cours
          status = 'pending';
        } else {
          // Par défaut, traiter toute autre valeur comme pending
          logger.warn(`Unknown API status received: "${apiStatus}", defaulting to 'pending'`);
          status = 'pending';
        }
        
        // Extraire le message d'erreur s'il existe
        let message: string | undefined;
        
        if (response.data.error) {
          message = response.data.error;
        } else if (response.data.message) {
          message = response.data.message;
        } else if (typeof response.data === 'string' && response.data !== apiStatus) {
          message = response.data;
        }
        
        logger.debug(`Twitter search status for job ${jobId}: ${status}${message ? `, message: ${message}` : ''}`);
        return { status, message };
      } catch (error) {
        logger.error(`Error checking Twitter search status for job ${jobId}:`, error);
        
        // Propager l'erreur avec plus de détails pour faciliter le débogage
        if (axios.isAxiosError(error)) {
          const status = error.response?.status || 'unknown';
          const message = error.response?.data?.error || error.message;
          
          // Si on reçoit un 404, ça peut signifier que le job est terminé ou invalide
          if (status === 404) {
            return {
              status: 'failed',
              message: `Job not found (404): ${message}`
            };
          }
          
          throw new Error(`Status check failed with HTTP ${status}: ${message} (Job ID: ${jobId})`);
        }
        
        throw new Error(`Failed to check status for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Récupère les résultats d'une recherche Twitter avec une meilleure gestion des erreurs
   * @param jobId ID du job de recherche
   * @returns Résultat de la recherche Twitter
   */
  async getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    return rateLimitHandler.executeWithRateLimit(async () => {
      try {
        if (!jobId || jobId.trim() === '') {
          throw new Error('Invalid job ID: empty or undefined');
        }
        
        logger.info(`Getting Twitter search results for job ${jobId}`);
        const response = await this.client.get(`${API_ENDPOINTS.TWITTER.RESULT}/${jobId}`);
        
        // Journaliser la structure de la réponse pour le débogage
        logger.debug(`Response data type: ${typeof response.data}`);
        logger.debug(`Response structure: ${JSON.stringify({
          isArray: Array.isArray(response.data),
          hasResults: response.data && response.data.results,
          length: Array.isArray(response.data) ? response.data.length : 'N/A'
        })}`);
        
        // Gestion robuste des différents formats de réponse possibles
        let tweetData;
        
        if (Array.isArray(response.data)) {
          // La réponse est directement un tableau
          tweetData = response.data;
          logger.debug(`Processing direct array response with ${tweetData.length} items`);
        } else if (response.data && typeof response.data === 'object') {
          if (Array.isArray(response.data.results)) {
            // La réponse est un objet avec une propriété results qui est un tableau
            tweetData = response.data.results;
            logger.debug(`Processing object with results array containing ${tweetData.length} items`);
          } else if (response.data.data && Array.isArray(response.data.data)) {
            // La réponse est un objet avec une propriété data qui est un tableau
            tweetData = response.data.data;
            logger.debug(`Processing object with data array containing ${tweetData.length} items`);
          } else {
            // Aucun format reconnu - créer un tableau vide
            logger.warn(`Unrecognized response format from API for job ${jobId}: ${JSON.stringify(response.data).substring(0, 200)}...`);
            tweetData = [];
          }
        } else {
          // Type de réponse invalide
          logger.error(`Invalid response format from API for job ${jobId}: ${typeof response.data}`);
          throw new Error(`Invalid response format from API: expected array or object, got ${typeof response.data}`);
        }
        
        // Si nous avons des résultats, journaliser un exemple pour faciliter le débogage
        if (tweetData.length > 0) {
          logger.debug(`Example tweet data format: ${JSON.stringify(tweetData[0])}`);
        } else {
          logger.info(`No tweets found for job ${jobId}`);
        }
        
        // Adapter le format de l'API à notre interface
        const processedData = tweetData.map((tweet: RawTweetData) => {
          // Déterminer si nous avons déjà un format compatible ou si nous devons le transformer
          if (tweet.Tweet) {
            return tweet; // Déjà au format compatible
          }
          
          // Extraction des données depuis le format API
          return {
            Tweet: {
              ID: tweet.ID || tweet.id || tweet.tweet_id || tweet.Metadata?.tweet_id || 'unknown_id',
              ExternalID: tweet.ExternalID || tweet.id?.toString() || tweet.tweet_id?.toString() || tweet.Metadata?.tweet_id?.toString(),
              Text: tweet.Content || tweet.text || tweet.content || tweet.Tweet || tweet.message || '',
              Username: tweet.Metadata?.username || tweet.username || tweet.user?.screen_name || tweet.author || 'unknown',
              CreatedAt: tweet.Metadata?.created_at || tweet.created_at || tweet.timestamp || new Date().toISOString(),
              LikeCount: tweet.Metadata?.public_metrics?.LikeCount || tweet.like_count || tweet.favorites || tweet.likes,
              RetweetCount: tweet.Metadata?.public_metrics?.RetweetCount || tweet.retweet_count || tweet.retweets
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
          throw new Error(`Results retrieval failed with status ${status}: ${message} (Job ID: ${jobId})`);
        }
        
        throw new Error(`Failed to retrieve results for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
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