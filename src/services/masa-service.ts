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

// Le reste du code reste inchangé
export class MasaServiceFactory {
  static async createService(mode: 'API' | 'PROTOCOL'): Promise<MasaService> {
    if (mode === 'API') {
      const { MasaApiService } = await import('./masa-api.js');
      return new MasaApiService();
    } else {
      const { MasaProtocolService } = await import('./masa-protocol.js');
      return new MasaProtocolService();
    }
  }
}