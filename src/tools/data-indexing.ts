// data-indexing.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import { z } from 'zod';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Enregistre les outils d'indexation et de requête de données (compatibles API et PROTOCOL)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerDataIndexingTool(server: McpServer, masaService: MasaService): void {
  // Ajouter une information sur l'utilisation du stockage en mémoire
  server.tool(
    'data_info',
    {},
    async () => {
      logger.info('Data info tool called');
      
      return {
        content: [{ 
          type: "text", 
          text: `# Data Indexing Information

Data indexing and querying operations use an in-memory storage system.
This means:
- Data is stored only for the duration of the server process
- Data will be lost when the server is restarted
- Operations are blazing fast but not persistent

This implementation works in both API and PROTOCOL modes.

## Available tools:
- index_data: Store data in memory
- query_data: Retrieve stored data using simple text search`
        }]
      };
    }
  );
  
  // Outil d'indexation de données
  server.tool(
    'index_data',
    {
      data: z.any().describe('Données à indexer (objet ou texte)'),
      metadata: z.record(z.any()).optional().describe('Métadonnées pour les données (optionnel)'),
      namespace: z.enum(['twitter', 'bittensor']).default('twitter').optional().describe('Espace de noms pour l\'indexation')
    },
    async ({ data, metadata, namespace = 'twitter' }) => {
      try {
        logger.info(`Indexing data in namespace: ${namespace}`);
        
        // Vérifier que les données sont présentes
        if (!data) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error: No data provided for indexing`
            }]
          };
        }
        
        // Convertir les données en texte si elles sont complexes
        let dataToIndex = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Indexer les données (utilise maintenant le mock service en interne)
        const indexResult = await masaService.indexData({
          data: dataToIndex,
          metadata,
          namespace
        });
        
        // Vérifier si une erreur s'est produite
        if (indexResult.status === 'error') {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error indexing data: ${indexResult.message || 'Unknown error'}`
            }]
          };
        }
        
        // Si le statut est "pending", vérifier périodiquement
        if (indexResult.status === 'pending') {
          const jobId = indexResult.id;
          logger.info(`Data indexing job created with ID: ${jobId}`);
          
          // Vérifier l'état de l'indexation jusqu'à ce qu'elle soit terminée
          let status = 'pending';
          // Initialiser statusResult avec un objet par défaut pour éviter l'erreur undefined
          let statusResult: { status: string, message?: string } = { status: 'pending' };
          
          // Attendre que l'indexation soit terminée (avec timeout après 30 secondes)
          const startTime = Date.now();
          const timeout = 30000; // 30 secondes
          
          while (status === 'pending') {
            // Vérifier si nous avons dépassé le timeout
            if (Date.now() - startTime > timeout) {
              return {
                content: [{
                  type: 'text',
                  text: `Data indexing job ${jobId} is still in progress. Check 'data_info' for more information.`
                }]
              };
            }
            
            // Attendre 1 seconde avant de vérifier à nouveau
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Vérifier l'état de l'indexation
            statusResult = await masaService.checkDataIndexStatus(jobId);
            status = statusResult.status;
            
            logger.debug(`Data indexing status: ${status}`);
          }
          
          // Vérifier si l'indexation a échoué
          if (status === 'failed') {
            return {
              isError: true,
              content: [{
                type: 'text',
                text: `Data indexing failed: ${statusResult.message || 'Unknown error'}`
              }]
            };
          }
        }
        
        // Construire la réponse
        return {
          content: [{
            type: 'text',
            text: `Data successfully indexed in namespace "${namespace}".\nJob ID: ${indexResult.id}\nStatus: ${indexResult.status}\n${indexResult.message ? `Message: ${indexResult.message}` : ''}`
          }]
        };
      } catch (error) {
        logger.error('Error in index_data tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error indexing data: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  // Outil de requête de données
  server.tool(
    'query_data',
    {
      query: z.string().describe('Requête de recherche'),
      namespace: z.enum(['twitter', 'bittensor']).default('twitter').optional().describe('Espace de noms à interroger'),
      limit: z.number().min(1).max(100).default(10).optional().describe('Nombre maximum de résultats'),
      offset: z.number().min(0).default(0).optional().describe('Offset pour la pagination')
    },
    async ({ query, namespace = 'twitter', limit = 10, offset = 0 }) => {
      try {
        logger.info(`Querying data in namespace: ${namespace} with query: "${query}"`);
        
        // Effectuer la requête (utilise maintenant le mock service en interne)
        const queryResult = await masaService.queryData({
          query,
          namespace,
          limit,
          offset
        });
        
        // Vérifier s'il y a des résultats
        if (queryResult.data.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for query: "${query}" in namespace "${namespace}"`
            }]
          };
        }
        
        // Formater les résultats
        let response = `## Data Query Results\n\nQuery: "${query}"\nNamespace: ${namespace}\n\n`;
        
        // Pour les résultats qui sont des objets complexes, les formater de manière lisible
        queryResult.data.forEach((item, index) => {
          response += `### Result ${index + 1}\n\n`;
          
          if (typeof item === 'string') {
            response += `${item}\n\n`;
          } else {
            // Tenter de formater l'objet de manière plus lisible
            try {
              // Si l'item a une propriété _source (format Elasticsearch), l'utiliser
              if (item._source) {
                const source = item._source;
                
                // Extraire les propriétés importantes
                for (const [key, value] of Object.entries(source)) {
                  // Formater différemment selon le type de valeur
                  if (typeof value === 'string') {
                    response += `**${key}**: ${value}\n`;
                  } else if (Array.isArray(value)) {
                    response += `**${key}**: ${value.join(', ')}\n`;
                  } else if (value !== null && typeof value === 'object') {
                    response += `**${key}**: ${JSON.stringify(value)}\n`;
                  } else {
                    response += `**${key}**: ${value}\n`;
                  }
                }
              } else {
                // Sinon, afficher l'ensemble de l'objet
                response += `\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`\n\n`;
              }
            } catch (e) {
              // En cas d'erreur, afficher l'objet brut
              response += `\`\`\`\n${JSON.stringify(item)}\n\`\`\`\n\n`;
            }
          }
        });
        
        // Ajouter les informations de pagination
        const paginationInfo = `Showing ${queryResult.data.length} of ${queryResult.total} results.`;
        const moreInfo = queryResult.hasMore ? ` There are more results available. Use offset=${offset + limit} to see the next page.` : '';
        
        response += `---\n${paginationInfo}${moreInfo}`;
        
        // Ajouter une note sur le stockage en mémoire
        response += `\n\nNote: Data is stored in memory for the current session only.`;
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      } catch (error) {
        logger.error('Error in query_data tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error querying data: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Data indexing tools registered successfully for in-memory storage');
}