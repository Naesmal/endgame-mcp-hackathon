// twitter-search.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import { 
  TwitterSearchResult, 
  TwitterData, 
  TwitterSearchRequest 
} from '../types';
import { z } from 'zod';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Enregistre l'outil de recherche Twitter de base (compatible API et PROTOCOL)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerTwitterSearchTool(server: McpServer, masaService: MasaService): void {
  server.tool(
    'twitter_search',
    {
      query: z.string().describe('Requête de recherche Twitter (mot-clé, hashtag, etc.)'),
      maxResults: z.number().default(10).optional().describe('Nombre maximum de résultats à retourner (max. 100)')
    },
    async ({ query, maxResults = 10 }) => {
      try {
        logger.info(`Performing Twitter search for query: ${query}`);
        
        // Effectuer la recherche initiale pour obtenir l'ID du job
        const searchResult = await masaService.searchTwitter({
          query,
          count: maxResults
        });
        
        // Vérifier si une erreur s'est produite
        if (searchResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error performing Twitter search: ${searchResult.error}`
            }]
          };
        }
        
        const jobId = searchResult.id;
        if (!jobId) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error: No job ID returned from Twitter search`
            }]
          };
        }
        
        logger.info(`Twitter search job initiated with ID: ${jobId}`);
        
        // Si nous sommes en mode API, nous devons gérer le flux asynchrone
        if (env.MASA_MODE === 'API') {
          // Attendre que la recherche soit terminée (avec timeout après 30 secondes)
          const startTime = Date.now();
          const timeout = 30000; // 30 secondes
          const pollingInterval = 1000; // 1 seconde entre les vérifications
          
          // Fonction pour vérifier périodiquement le statut
          const checkStatus = async (): Promise<TwitterSearchResult | null> => {
            // Vérifier si nous avons dépassé le timeout
            if (Date.now() - startTime > timeout) {
              throw new Error(`Twitter search timed out after ${timeout/1000} seconds`);
            }
            
            try {
              // Vérifier l'état de la recherche
              const statusResult = await masaService.checkTwitterSearchStatus(jobId);
              logger.debug(`Twitter search status: ${statusResult.status}`);
              
              if (statusResult.status === 'completed') {
                // Recherche terminée avec succès, récupérer les résultats
                return await masaService.getTwitterSearchResults(jobId);
              } else if (statusResult.status === 'failed') {
                // Recherche échouée
                throw new Error(`Twitter search failed: ${statusResult.message || 'Unknown error'}`);
              } else {
                // Recherche toujours en cours, attendre et réessayer
                await new Promise(resolve => setTimeout(resolve, pollingInterval));
                return null; // Signale qu'il faut continuer à vérifier
              }
            } catch (error) {
              throw error;
            }
          };
          
          // Boucle de polling avec gestion d'erreur
          let results: TwitterSearchResult | null = null;
          try {
            while (results === null) {
              results = await checkStatus();
            }
            
            // À ce stade, nous avons les résultats
            const tweetResults = results.data || [];
            
            if (tweetResults.length === 0) {
              return {
                content: [{
                  type: 'text',
                  text: `No tweets found for query: ${query}`
                }]
              };
            }
            
            // Formater les résultats
            const formattedTweets = tweetResults.map((item: TwitterData) => {
              if (item.Tweet) {
                const tweet = item.Tweet;
                const date = tweet.CreatedAt ? new Date(tweet.CreatedAt).toLocaleString() : 'Unknown date';
                
                // Ajouter des informations sur les likes et retweets si disponibles
                let statsInfo = '';
                if (tweet.LikeCount !== undefined || tweet.RetweetCount !== undefined) {
                  let stats = [];
                  if (tweet.LikeCount !== undefined) stats.push(`❤️ ${tweet.LikeCount}`);
                  if (tweet.RetweetCount !== undefined) stats.push(`🔄 ${tweet.RetweetCount}`);
                  statsInfo = ` [${stats.join(' | ')}]`;
                }
                
                return `@${tweet.Username} (${date})${statsInfo}: ${tweet.Text}`;
              }
              return null;
            }).filter(Boolean);
            
            return {
              content: [{
                type: 'text',
                text: `Found ${formattedTweets.length} tweets for query "${query}":\n\n${formattedTweets.join('\n\n')}`
              }]
            };
          } catch (error) {
            // Gérer les erreurs de polling
            return {
              isError: true,
              content: [{
                type: 'text',
                text: `Error during Twitter search process: ${error instanceof Error ? error.message : 'Unknown error'}`
              }]
            };
          }
          
        } else {
          // En mode PROTOCOL, les résultats sont disponibles immédiatement
          const tweetResults = searchResult.data || [];
          
          if (tweetResults.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No tweets found for query: ${query}`
              }]
            };
          }
          
          // Formater les résultats
          const formattedTweets = tweetResults.map((item: TwitterData) => {
            if (item.Tweet) {
              const tweet = item.Tweet;
              return `@${tweet.Username} (${new Date(tweet.CreatedAt).toLocaleString()}): ${tweet.Text}`;
            }
            return null;
          }).filter(Boolean);
          
          return {
            content: [{
              type: 'text',
              text: `Found ${formattedTweets.length} tweets for query "${query}":\n\n${formattedTweets.join('\n\n')}`
            }]
          };
        }
      } catch (error) {
        logger.error('Error in twitter_search tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error performing Twitter search: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Twitter search tool registered successfully');
}

/**
 * Enregistre l'outil de recherche Twitter avancée (uniquement compatible PROTOCOL)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerTwitterAdvancedSearchTool(server: McpServer, masaService: MasaService): void {
  // Vérifier que nous sommes en mode PROTOCOL
  if (env.MASA_MODE !== 'PROTOCOL') {
    logger.warn('Advanced Twitter search tool is only available in PROTOCOL mode');
    return;
  }
  
  server.tool(
    'twitter_advanced_search',
    {
      query: z.string().describe('Requête de recherche Twitter avancée'),
      fromDate: z.string().optional().describe('Date de début (format: YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Date de fin (format: YYYY-MM-DD)'),
      language: z.string().optional().describe('Code de langue (ex: fr, en)'),
      excludeRetweets: z.boolean().default(false).optional().describe('Exclure les retweets'),
      minLikes: z.number().optional().describe('Nombre minimum de likes'),
      minRetweets: z.number().optional().describe('Nombre minimum de retweets'),
      maxResults: z.number().default(10).optional().describe('Nombre maximum de résultats')
    },
    async ({ query, fromDate, toDate, language, excludeRetweets, minLikes, minRetweets, maxResults = 10 }) => {
      try {
        logger.info(`Performing advanced Twitter search for query: ${query}`);
        
        // Construire la requête avancée
        let advancedQuery = query;
        
        // Ajouter les filtres de date
        if (fromDate) {
          advancedQuery += ` since:${fromDate}`;
        }
        if (toDate) {
          advancedQuery += ` until:${toDate}`;
        }
        
        // Ajouter le filtre de langue
        if (language) {
          advancedQuery += ` lang:${language}`;
        }
        
        // Ajouter le filtre d'exclusion des retweets
        if (excludeRetweets) {
          advancedQuery += ' -filter:retweets';
        }
        
        // Ajouter le filtre de likes minimum
        if (minLikes) {
          advancedQuery += ` min_faves:${minLikes}`;
        }
        
        // Ajouter le filtre de retweets minimum
        if (minRetweets) {
          advancedQuery += ` min_retweets:${minRetweets}`;
        }
        
        // Effectuer la recherche avancée
        const searchResult = await masaService.searchTwitter({
          query: advancedQuery,
          count: maxResults
        });
        
        // Vérifier si une erreur s'est produite
        if (searchResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error performing advanced Twitter search: ${searchResult.error}`
            }]
          };
        }
        
        // En mode PROTOCOL, les résultats sont disponibles immédiatement
        const tweetResults = searchResult.data || [];
        
        if (tweetResults.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No tweets found for advanced query: ${advancedQuery}`
            }]
          };
        }
        
        // Formater les résultats
        const formattedTweets = tweetResults
          .filter((item: TwitterData) => item.Tweet)
          .map((item: TwitterData) => {
            // Vérifier que Tweet existe avant d'y accéder
            const tweet = item.Tweet;
            // Puisque nous avons déjà filtré, tweet ne peut pas être undefined ici,
            // mais TypeScript a besoin d'une vérification non-null supplémentaire
            if (!tweet) return null; // Cette ligne ne sera jamais exécutée mais satisfait TypeScript
            
            let tweetInfo = `@${tweet.Username} (${new Date(tweet.CreatedAt).toLocaleString()})`;
            
            // Ajouter des informations sur les likes et retweets si disponibles
            if (tweet.LikeCount !== undefined || tweet.RetweetCount !== undefined) {
              let stats = [];
              if (tweet.LikeCount !== undefined) stats.push(`❤️ ${tweet.LikeCount}`);
              if (tweet.RetweetCount !== undefined) stats.push(`🔄 ${tweet.RetweetCount}`);
              tweetInfo += ` [${stats.join(' | ')}]`;
            }
            
            return `${tweetInfo}: ${tweet.Text}`;
          })
          .filter(Boolean); // Filtrer les valeurs null éventuelles
        
        return {
          content: [{
            type: 'text',
            text: `Found ${formattedTweets.length} tweets for advanced query "${advancedQuery}":\n\n${formattedTweets.join('\n\n')}`
          }]
        };
      } catch (error) {
        logger.error('Error in twitter_advanced_search tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error performing advanced Twitter search: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Advanced Twitter search tool registered successfully');
}