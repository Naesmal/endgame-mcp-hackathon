import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil d'indexation de données dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerDataIndexingTool(
  server: McpServer,
  masaService: MasaService
): void {
  // Outil d'indexation de données
  server.tool(
    'index_data', 
    {
      data: z.union([z.string(), z.record(z.string(), z.any())]),
      metadata: z.record(z.string(), z.any()).optional(),
      namespace: z.string().optional(),
    },
    async (params) => {
      try {
        const { data, metadata } = params;
        
        // Déterminer le namespace à utiliser (twitter par défaut)
        let namespace = 'twitter';
        
        // Si un namespace est spécifié, vérifier s'il est valide
        if (params.namespace) {
          // Valider le namespace (twitter ou bittensor)
          if (['twitter', 'bittensor'].includes(params.namespace.toLowerCase())) {
            namespace = params.namespace.toLowerCase();
          } else {
            logger.warn(`Namespace override: requested '${params.namespace}' but using 'twitter' as fallback. Valid namespaces: twitter, bittensor`);
          }
        }

        logger.info(`Indexing data in namespace: ${namespace}`);
        
        // Vérifier que les données ne sont pas null ou undefined
        if (data === null || data === undefined) {
          return {
            content: [{ type: "text", text: "Error: data is required and cannot be null or undefined" }],
            isError: true
          };
        }
        
        // Convertir les données en string si ce n'est pas déjà un objet
        const dataToIndex = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Exécuter l'indexation avec le namespace sélectionné
        const result = await masaService.indexData({
          data: dataToIndex,
          metadata,
          namespace
        });
        
        // Retourner le résultat
        return {
          content: [{ type: "text", text: `Data indexed successfully in ${namespace} namespace. Job ID: ${result.id}, Status: ${result.status}` }]
        };
      } catch (error) {
        logger.error('Error in index_data tool:', error);
        return {
          content: [{ type: "text", text: `Error indexing data: ${error instanceof Error ? error.message : 'Unknown error'}` }],
          isError: true
        };
      }
    }
  );
  
  // Outil de recherche de données
  server.tool(
    'query_data', 
    {
      query: z.string().min(1, 'Query is required'),
      namespace: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    },
    async (params) => {
      try {
        const { query, limit, offset } = params;
        
        // Déterminer le namespace à utiliser (twitter par défaut)
        let namespace = 'twitter';
        
        // Si un namespace est spécifié, vérifier s'il est valide
        if (params.namespace) {
          // Valider le namespace (twitter ou bittensor)
          if (['twitter', 'bittensor'].includes(params.namespace.toLowerCase())) {
            namespace = params.namespace.toLowerCase();
          } else {
            logger.warn(`Namespace override: requested '${params.namespace}' but using 'twitter' as fallback. Valid namespaces: twitter, bittensor`);
          }
        }
        
        logger.info(`Querying data with: ${query} in namespace: ${namespace}`);
        
        // Exécuter la recherche avec le namespace choisi
        const result = await masaService.queryData({
          query,
          namespace,
          limit,
          offset
        });
        
        // Si aucun résultat, retourner un message approprié
        if (result.data.length === 0) {
          return {
            content: [{ type: "text", text: `No data found for query: ${query} in ${namespace} data` }]
          };
        }
        
        // Créer un résumé des résultats
        const summary = `Found ${result.data.length} results for query: ${query} in ${namespace} namespace`;
        const pagination = `Showing ${offset || 0}-${(offset || 0) + result.data.length} of ${result.total}`;
        const jsonResults = JSON.stringify({
          query,
          namespace,
          total: result.total,
          hasMore: result.hasMore,
          results: result.data
        }, null, 2);
        
        // Retourner les résultats formatés sous forme de texte
        return {
          content: [
            { type: "text", text: `${summary}\n${pagination}\n\n${jsonResults}` }
          ]
        };
      } catch (error) {
        logger.error('Error in query_data tool:', error);
        return {
          content: [{ type: "text", text: `Error querying data: ${error instanceof Error ? error.message : 'Unknown error'}` }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Data indexing tools registered');
}