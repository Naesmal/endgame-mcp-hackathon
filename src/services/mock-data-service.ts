// mock-data-service.ts
import { DataIndexRequest, DataIndexResult, DataQueryRequest, DataQueryResult } from '../types';
import logger from '../utils/logger';

/**
 * Implémentation d'un service de données en mémoire
 * Utilisé comme fallback quand les endpoints API/PROTOCOL ne sont pas disponibles
 */
class MockDataService {
  private dataStore: {
    [namespace: string]: {
      [id: string]: {
        data: any;
        metadata?: Record<string, any>;
        timestamp: number;
      }
    }
  };
  
  constructor() {
    this.dataStore = {
      'twitter': {},
      'bittensor': {}
    };
    logger.info('Mock data service initialized');
  }
  
  /**
   * Indexer des données en mémoire
   * @param request Requête d'indexation
   * @returns Résultat d'indexation
   */
  async indexData(request: DataIndexRequest): Promise<DataIndexResult> {
    try {
      const namespace = request.namespace?.toLowerCase() || 'twitter';
      
      // Vérifier si le namespace est valide
      if (namespace !== 'twitter' && namespace !== 'bittensor') {
        return {
          id: `mock_${Date.now()}`,
          status: 'error',
          message: `Invalid namespace: ${namespace}. Must be 'twitter' or 'bittensor'.`
        };
      }
      
      // Génération d'un ID unique
      const id = `mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Stocker les données
      this.dataStore[namespace][id] = {
        data: request.data,
        metadata: request.metadata,
        timestamp: Date.now()
      };
      
      logger.info(`[MOCK] Data indexed in namespace ${namespace} with ID ${id}`);
      
      return {
        id: id,
        status: 'success',
        message: `Data successfully indexed in mock storage (namespace: ${namespace})`
      };
    } catch (error) {
      logger.error('[MOCK] Error indexing data:', error);
      return {
        id: `mock_error_${Date.now()}`,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Rechercher des données en mémoire
   * @param request Requête de recherche
   * @returns Résultat de recherche
   */
  async queryData(request: DataQueryRequest): Promise<DataQueryResult> {
    try {
      const namespace = request.namespace?.toLowerCase() || 'twitter';
      const query = request.query?.toLowerCase() || '';
      const limit = request.limit || 10;
      const offset = request.offset || 0;
      
      // Vérifier si le namespace est valide
      if (namespace !== 'twitter' && namespace !== 'bittensor') {
        return {
          data: [],
          total: 0,
          hasMore: false
        };
      }
      
      // Récupérer toutes les données du namespace
      const namespaceData = this.dataStore[namespace];
      const results = [];
      
      // Filtrer les données en fonction de la requête
      for (const [id, item] of Object.entries(namespaceData)) {
        // Recherche simple dans les données et métadonnées
        const dataString = JSON.stringify(item.data).toLowerCase();
        const metadataString = item.metadata ? JSON.stringify(item.metadata).toLowerCase() : '';
        
        if (dataString.includes(query) || metadataString.includes(query)) {
          results.push({
            id: id,
            ...item.data,
            _source: {
              ...item.data,
              metadata: item.metadata,
              timestamp: item.timestamp
            }
          });
        }
      }
      
      // Appliquer pagination
      const paginatedResults = results.slice(offset, offset + limit);
      
      logger.info(`[MOCK] Data query in namespace ${namespace} returned ${paginatedResults.length} results`);
      
      return {
        data: paginatedResults,
        total: results.length,
        hasMore: offset + limit < results.length
      };
    } catch (error) {
      logger.error('[MOCK] Error querying data:', error);
      return {
        data: [],
        total: 0,
        hasMore: false
      };
    }
  }
  
  /**
   * Vérifier l'état d'une indexation
   * Toujours retourne "completed" car l'indexation est instantanée en mémoire
   */
  async checkDataIndexStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }> {
    // Vérifier si l'ID correspond à une entrée
    const matches = jobId.match(/^mock_(\d+)_(\d+)$/);
    
    if (matches) {
      return {
        status: 'completed',
        message: 'Mock indexing completed instantly'
      };
    }
    
    return {
      status: 'failed',
      message: 'Invalid mock job ID'
    };
  }
}

// Exporter une instance unique du service
export const mockDataService = new MockDataService();