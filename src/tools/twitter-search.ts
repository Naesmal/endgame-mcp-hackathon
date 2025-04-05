import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil de recherche Twitter dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerTwitterSearchTool(
  server: McpServer,
  masaService: MasaService
): void {
  // Outil de recherche Twitter simple
  server.tool(
    'twitter_search',
    {
      query: z.string().min(1, 'Query is required'),
      count: z.number().optional(),
      sinceDays: z.number().optional()
    },
    async (params) => {
      try {
        const { query, count, sinceDays } = params;
        
        logger.info(`Executing Twitter search: ${query}`);
        
        // Construire la requête
        const request: { query: string; count: number; fromDate?: string } = {
          query,
          count: count || 10
        };
        
        // Si sinceDays est fourni, calculer la date de début
        if (sinceDays) {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - sinceDays);
          request.fromDate = fromDate.toISOString().split('T')[0];
        }
        
        // Exécuter la recherche
        const result = await masaService.searchTwitter(request);
        
        // Formater les résultats pour le client MCP
        const searchResults = result.data?.map(item => {
          if (item.Tweet) {
            return {
              id: item.Tweet.ID,
              text: item.Tweet.Text,
              username: item.Tweet.Username,
              date: item.Tweet.CreatedAt,
              hashtags: item.Tweet.Hashtags?.join(', ') || '',
              likes: item.Tweet.LikeCount || 0,
              retweets: item.Tweet.RetweetCount || 0,
              replies: item.Tweet.ReplyCount || 0
            };
          } 
          return { error: item.Error || 'No tweet data available' };
        }) || [];
        
        // Si aucun résultat, retourner un message approprié
        if (searchResults.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: `No tweets found for query: ${query}` 
            }] 
          };
        }
        
        // Créer un résumé des résultats et le JSON
        const summary = `Found ${searchResults.length} tweets for "${query}"`;
        const jsonResults = JSON.stringify({ 
          searchId: result.id,
          results: searchResults
        }, null, 2);
        
        // Retourner les résultats formatés en texte
        return { 
          content: [
            { type: "text", text: `${summary}\n\n${jsonResults}` }
          ]
        };
      } catch (error) {
        logger.error('Error in twitter_search tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error searching Twitter: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil de recherche Twitter avancée
  server.tool(
    'twitter_advanced_search',
    {
      query: z.string().min(1, 'Query is required'),
      fromUser: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      minLikes: z.number().optional(),
      minRetweets: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      count: z.number().optional(),
      excludeRetweets: z.boolean().optional()
    },
    async (params) => {
      try {
        const { query, fromUser, hashtags, minLikes, minRetweets, fromDate, toDate, count, excludeRetweets } = params;
        
        logger.info(`Executing advanced Twitter search: ${query}`);
        
        // Construire la requête avancée
        let advancedQuery = query;
        
        // Ajouter les filtres supplémentaires
        if (fromUser) {
          advancedQuery += ` from:${fromUser}`;
        }
        
        if (hashtags && hashtags.length > 0) {
          advancedQuery += ` ${hashtags.map(tag => `#${tag}`).join(' OR ')}`;
        }
        
        if (minLikes) {
          advancedQuery += ` min_faves:${minLikes}`;
        }
        
        if (minRetweets) {
          advancedQuery += ` min_retweets:${minRetweets}`;
        }
        
        if (excludeRetweets) {
          advancedQuery += ' -filter:retweets';
        }
        
        // Exécuter la recherche avec la requête avancée
        const result = await masaService.searchTwitter({
          query: advancedQuery,
          count: count || 10,
          fromDate: fromDate,
          toDate: toDate
        });
        
        // Formater les résultats pour le client MCP
        const searchResults = result.data?.map(item => {
          if (item.Tweet) {
            return {
              id: item.Tweet.ID,
              text: item.Tweet.Text,
              username: item.Tweet.Username,
              date: item.Tweet.CreatedAt,
              hashtags: item.Tweet.Hashtags?.join(', ') || '',
              likes: item.Tweet.LikeCount || 0,
              retweets: item.Tweet.RetweetCount || 0,
              replies: item.Tweet.ReplyCount || 0
            };
          } 
          return { error: item.Error || 'No tweet data available' };
        }) || [];
        
        // Si aucun résultat, retourner un message approprié
        if (searchResults.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: `No tweets found for advanced query: ${advancedQuery}` 
            }] 
          };
        }
        
        // Créer un résumé des résultats
        const summary = `Found ${searchResults.length} tweets for advanced query`;
        const jsonResults = JSON.stringify({ 
          searchId: result.id,
          query: advancedQuery,
          results: searchResults
        }, null, 2);
        
        // Retourner les résultats formatés
        return { 
          content: [
            { type: "text", text: `${summary}\n\n${jsonResults}` }
          ]
        };
      } catch (error) {
        logger.error('Error in twitter_advanced_search tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error performing advanced Twitter search: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Twitter search tools registered');
}