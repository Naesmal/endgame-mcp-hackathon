// masa-service.ts
import {
  TwitterSearchRequest,
  TwitterSearchResult,
  DataIndexRequest,
  DataIndexResult,
  DataQueryRequest,
  DataQueryResult,
  // Nouveaux types à importer
  WebScrapeRequest,
  WebScrapeResult,
  TermExtractionRequest,
  TermExtractionResult,
  DataAnalysisRequest,
  DataAnalysisResult,
  SimilaritySearchRequest,
  SimilaritySearchResult,
  SubnetInfo,
  NodeInfo
} from '../types';
import { mockDataService } from './mock-data-service';
import logger from '../utils/logger';

/**
 * Interface abstraite pour les services Masa
 * Cette interface définit les méthodes que doivent implémenter
 * à la fois l'API Masa et le Protocol Masa
 */
export interface MasaService {
  // Méthodes existantes
  searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult>;
  
  checkTwitterSearchStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }>;
  
  getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult>;
  
  indexData(request: DataIndexRequest): Promise<DataIndexResult>;
  
  queryData(request: DataQueryRequest): Promise<DataQueryResult>;
  
  checkDataIndexStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }>;
  
  // Nouvelles méthodes
  
  /**
   * Scrape une page web pour extraire son contenu
   * @param request Paramètres de scraping
   * @returns Résultat du scraping
   */
  scrapeWeb(request: WebScrapeRequest): Promise<WebScrapeResult>;
  
  /**
   * Extraire des termes de recherche à partir d'un prompt utilisateur (via IA)
   * @param request Prompt utilisateur
   * @returns Termes de recherche générés
   */
  extractSearchTerms(request: TermExtractionRequest): Promise<TermExtractionResult>;
  
  /**
   * Analyser des tweets avec un prompt personnalisé
   * @param request Tweets et prompt d'analyse
   * @returns Résultat de l'analyse
   */
  analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResult>;
  
  /**
   * Recherche par similarité sémantique
   * @param request Paramètres de recherche
   * @returns Résultats de la recherche
   */
  searchBySimilarity(request: SimilaritySearchRequest): Promise<SimilaritySearchResult>;
}

/**
 * Décorateur de service Masa qui intercepte les requêtes d'indexation et de requête de données
 * pour les rediriger vers le service de mock quand nécessaire
 */
export class EnhancedMasaService implements MasaService {
  private service: MasaService;
  private mode: 'API' | 'PROTOCOL';
  
  constructor(service: MasaService, mode: 'API' | 'PROTOCOL') {
    this.service = service;
    this.mode = mode;
    logger.info(`Enhanced Masa service created in ${mode} mode with data service mock`);
  }
  
  // Rediriger toutes les méthodes standard vers le service d'origine
  searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult> {
    return this.service.searchTwitter(request);
  }
  
  checkTwitterSearchStatus(jobId: string): Promise<{ status: 'pending' | 'completed' | 'failed'; message?: string }> {
    return this.service.checkTwitterSearchStatus(jobId);
  }
  
  getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult> {
    return this.service.getTwitterSearchResults(jobId);
  }
  
  scrapeWeb(request: WebScrapeRequest): Promise<WebScrapeResult> {
    return this.service.scrapeWeb(request);
  }
  
  extractSearchTerms(request: TermExtractionRequest): Promise<TermExtractionResult> {
    return this.service.extractSearchTerms(request);
  }
  
  analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResult> {
    return this.service.analyzeData(request);
  }
  
  searchBySimilarity(request: SimilaritySearchRequest): Promise<SimilaritySearchResult> {
    return this.service.searchBySimilarity(request);
  }
  
  // Rediriger les opérations de données vers le service mock
  async indexData(request: DataIndexRequest): Promise<DataIndexResult> {
    logger.info(`Using mock data service for indexData in ${this.mode} mode`);
    // Toujours utiliser le mock data service
    return mockDataService.indexData(request);
  }
  
  async queryData(request: DataQueryRequest): Promise<DataQueryResult> {
    logger.info(`Using mock data service for queryData in ${this.mode} mode`);
    // Toujours utiliser le mock data service
    return mockDataService.queryData(request);
  }
  
  async checkDataIndexStatus(jobId: string): Promise<{ status: 'pending' | 'completed' | 'failed'; message?: string }> {
    // Si l'ID commence par "mock_", utiliser le service mock
    if (jobId.startsWith('mock_')) {
      logger.info(`Using mock data service for checkDataIndexStatus with ID: ${jobId}`);
      return mockDataService.checkDataIndexStatus(jobId);
    }
    
    // Sinon, utiliser le service d'origine
    return this.service.checkDataIndexStatus(jobId);
  }
}

// Le reste du code reste inchangé
export class MasaServiceFactory {
  static async createService(mode: 'API' | 'PROTOCOL'): Promise<MasaService> {
    // Créer le service de base
    let baseService: MasaService;
    
    if (mode === 'API') {
      const { MasaApiService } = await import('./masa-api.js');
      baseService = new MasaApiService();
    } else {
      const { MasaProtocolService } = await import('./masa-protocol.js');
      baseService = new MasaProtocolService();
    }
    
    // Envelopper le service dans le décorateur
    return new EnhancedMasaService(baseService, mode);
  }
}