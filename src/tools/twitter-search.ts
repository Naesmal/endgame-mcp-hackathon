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
 * Fonction améliorée qui attend que la recherche Twitter soit terminée
 * @param masaService Service Masa à utiliser
 * @param jobId ID du job à surveiller
 * @param timeoutMs Timeout en millisecondes
 * @param intervalMs Intervalle de polling en millisecondes
 */
async function waitForTwitterSearchCompletion(
  masaService: MasaService,
  jobId: string,
  timeoutMs: number = 30000,
  intervalMs: number = 2000
): Promise<TwitterSearchResult> {
  logger.info(`Waiting for Twitter search job ${jobId} to complete`);
  
  const startTime = Date.now();
  
  // Fonction pour afficher un message de progression cohérent
  const logProgress = (elapsed: number) => {
    const seconds = (elapsed / 1000).toFixed(1);
    logger.info(`Twitter search in progress... (${seconds}s elapsed, Job ID: ${jobId})`);
  };
  
  // Vérification initiale de l'UUID
  if (!jobId || jobId.trim() === '') {
    throw new Error('Invalid job ID: empty or undefined');
  }
  
  logger.debug(`Starting polling for job ID: ${jobId}`);
  
  // Boucle de polling améliorée
  while (true) {
    // Vérifier si nous avons dépassé le timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      throw new Error(`Twitter search timed out after ${timeoutMs/1000} seconds (Job ID: ${jobId})`);
    }
    
    try {
      // Vérifier l'état de la recherche
      const statusResult = await masaService.checkTwitterSearchStatus(jobId);
      logger.debug(`Twitter search status for job ${jobId}: ${statusResult.status}`);
      
      if (statusResult.status === 'completed') {
        // Recherche terminée avec succès, récupérer les résultats
        logger.info(`Job ${jobId} completed, retrieving results...`);
        const results = await masaService.getTwitterSearchResults(jobId);
        
        // Vérification supplémentaire des résultats
        if (!results) {
          throw new Error(`Retrieved null results for completed job ${jobId}`);
        }
        
        // Vérifier si les résultats contiennent une erreur
        if (results.error) {
          throw new Error(`Error in search results for job ${jobId}: ${results.error}`);
        }
        
        logger.info(`Successfully retrieved results for job ${jobId}: ${results.data?.length || 0} tweets found`);
        return results;
      } else if (statusResult.status === 'failed') {
        // Recherche échouée
        throw new Error(`Twitter search failed for job ${jobId}: ${statusResult.message || 'Unknown error'}`);
      } else {
        // Recherche toujours en cours, afficher la progression
        logProgress(elapsed);
        
        // Attendre avant la prochaine vérification
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      // Si l'erreur vient de l'appel de statut lui-même, la propager avec plus de contexte
      logger.error(`Error checking Twitter search status for job ${jobId}:`, error);
      throw new Error(`Error while checking status for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

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
          try {
            // Journaliser clairement le début du processus
            logger.info(`Starting asynchronous Twitter search process for job ${jobId}`);
            
            // Utiliser la fonction d'attente améliorée
            const results = await waitForTwitterSearchCompletion(
              masaService,
              jobId,
              45000, // 45 secondes de timeout (augmenté)
              2000   // 2 secondes entre chaque vérification
            );
            
            // Vérification explicite des résultats
            if (!results) {
              logger.error(`Received null results after polling completion for job ${jobId}`);
              return {
                isError: true,
                content: [{
                  type: 'text',
                  text: `Error during Twitter search process: No results returned after polling completion`
                }]
              };
            }
            
            // À ce stade, nous avons les résultats
            const tweetResults = results.data || [];
            
            // Journaliser le nombre de résultats trouvés
            logger.info(`Retrieved ${tweetResults.length} tweets for query "${query}" (job ID: ${jobId})`);
            
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
            // Gérer les erreurs de polling avec plus de détails
            logger.error(`Error during Twitter search process for job ${jobId}:`, error);
            return {
              isError: true,
              content: [{
                type: 'text',
                text: `Error during Twitter search process: ${error instanceof Error ? error.message : 'Unknown error'}\nJob ID: ${jobId}`
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