import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre la ressource de données dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerDataResource(
  server: McpServer,
  masaService: MasaService
): void {
  // Ressource pour les recherches Twitter
  server.resource(
    'twitter_searches',
    new ResourceTemplate('twitter-search://{searchId}', {
      list: async () => {
        try {
          logger.info('Listing Twitter searches');
          // Retourner au format attendu par MCP pour list
          return {
            resources: [
              {
                uri: 'twitter-search://info',
                name: 'Twitter Searches',
                description: 'Use twitter-search://{searchId} to access search results'
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing Twitter searches:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Si un ID de recherche est fourni, récupérer les résultats spécifiques
        if (params.searchId) {
          logger.info(`Getting Twitter search results for ID: ${params.searchId}`);
          
          // Récupérer les résultats
          const searchId = Array.isArray(params.searchId) ? params.searchId[0] : params.searchId;
          const result = await masaService.getTwitterSearchResults(searchId);
          
          // Vérifier si une erreur s'est produite
          if (result.error) {
            return {
              contents: [],
              errorMessage: result.error
            };
          }
          
          // Formater les résultats
          const searchResults = result.data?.map(item => {
            if (item.Tweet) {
              return {
                text: item.Tweet.Text,
                username: item.Tweet.Username,
                date: item.Tweet.CreatedAt,
              };
            }
            return { error: item.Error || 'No tweet data available' };
          }) || [];
          
          return {
            title: `Twitter search results (${searchResults.length} tweets)`,
            contents: searchResults.map((tweet, index) => ({
              uri: `twitter-search://${params.searchId}/tweet/${index}`,
              text: tweet.text || 'No text available'
            }))
          };
        }
        
        // Si aucun ID de recherche n'est fourni, retourner une liste vide avec un message d'erreur
        return {
          contents: [],
          errorMessage: 'Search ID is required'
        };
      } catch (error) {
        logger.error('Error in twitter_searches resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving Twitter search results: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  logger.info('Twitter searches resource registered successfully');
}