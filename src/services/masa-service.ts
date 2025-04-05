import {
    TwitterSearchRequest,
    TwitterSearchResult,
    DataIndexRequest,
    DataIndexResult,
    DataQueryRequest,
    DataQueryResult,
    SubnetInfo,
    NodeInfo
  } from '../types';
  
  /**
   * Interface abstraite pour les services Masa
   * Cette interface définit les méthodes que doivent implémenter
   * à la fois l'API Masa et le Protocol Masa
   */
  export interface MasaService {
    /**
     * Recherche des tweets sur Twitter/X
     * @param request Paramètres de recherche
     * @returns Résultats de la recherche
     */
    searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult>;
    
    /**
     * Vérifie le statut d'une recherche Twitter
     * @param jobId ID du job de recherche
     * @returns Statut de la recherche
     */
    checkTwitterSearchStatus(jobId: string): Promise<{
      status: 'pending' | 'completed' | 'failed';
      message?: string;
    }>;
    
    /**
     * Récupère les résultats d'une recherche Twitter
     * @param jobId ID du job de recherche
     * @returns Résultats de la recherche
     */
    getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult>;
    
    /**
     * Indexe des données dans le subnet
     * @param request Données à indexer
     * @returns Résultat de l'indexation
     */
    indexData(request: DataIndexRequest): Promise<DataIndexResult>;
    
    /**
     * Recherche des données dans le subnet
     * @param request Paramètres de recherche
     * @returns Résultats de la recherche
     */
    queryData(request: DataQueryRequest): Promise<DataQueryResult>;
    
    /**
     * Vérifie le statut d'une indexation de données
     * @param jobId ID du job d'indexation
     * @returns Statut de l'indexation
     */
    checkDataIndexStatus(jobId: string): Promise<{
      status: 'pending' | 'completed' | 'failed';
      message?: string;
    }>;
  }
  
  /**
   * Fabrique de service Masa
   * Cette classe permet de créer l'implémentation appropriée
   * du service Masa en fonction du mode configuré
   */
  export class MasaServiceFactory {
    /**
     * Crée une instance du service Masa
     * @param mode Mode de communication ('API' ou 'PROTOCOL')
     * @returns Instance du service Masa
     */
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