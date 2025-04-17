import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil d'analyse de données dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerDataAnalysisTool(
  server: McpServer,
  masaService: MasaService
): void {
  // Outil d'extraction de termes de recherche
  server.tool(
    'extract_search_terms',
    {
      userInput: z.string().min(3, 'User input must have at least 3 characters'),
      count: z.number().min(1).max(10).optional()
    },
    async (params) => {
      try {
        const { userInput, count } = params;
        
        logger.info(`Extracting search terms from: ${userInput}`);
        
        // Construire la requête
        const request = {
          userInput,
          count: count || 3
        };
        
        // Exécuter l'extraction
        const result = await masaService.extractSearchTerms(request);
        
        // Vérifier s'il y a une erreur
        if (result.error) {
          return { 
            content: [{ 
              type: "text", 
              text: `Error extracting search terms: ${result.error}` 
            }],
            isError: true
          };
        }
        
        // Si pas de termes, retourner un message approprié
        if (!result.searchTerms || result.searchTerms.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: `No search terms could be extracted from: "${userInput}"` 
            }]
          };
        }
        
        // Formater le résultat
        let formattedResult = `# Search Terms Extracted\n\n`;
        formattedResult += `Original input: "${userInput}"\n\n`;
        formattedResult += `## Terms\n\n`;
        
        result.searchTerms.forEach((term, index) => {
          formattedResult += `${index + 1}. **${term}**\n`;
        });
        
        if (result.thinking) {
          formattedResult += `\n## AI Thinking\n\n${result.thinking}\n`;
        }
        
        // Retourner le contenu formaté
        return { 
          content: [{ 
            type: "text", 
            text: formattedResult 
          }]
        };
      } catch (error) {
        logger.error('Error in extract_search_terms tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error extracting search terms: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil d'analyse de tweets
  server.tool(
    'analyze_tweets',
    {
      tweets: z.union([z.string(), z.array(z.string())]),
      prompt: z.string().min(5, 'Analysis prompt must have at least 5 characters')
    },
    async (params) => {
      try {
        const { tweets, prompt } = params;
        
        logger.info(`Analyzing tweets with prompt: ${prompt}`);
        
        // Convertir les tweets en tableau si ce n'est pas déjà le cas
        const tweetArray = Array.isArray(tweets) ? tweets : [tweets];
        
        // Si aucun tweet, retourner un message d'erreur
        if (tweetArray.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: "No tweets provided for analysis" 
            }],
            isError: true
          };
        }
        
        // Construire la requête
        const request = {
          tweets: tweetArray,
          prompt
        };
        
        // Exécuter l'analyse
        const result = await masaService.analyzeData(request);
        
        // Vérifier s'il y a une erreur
        if (result.error) {
          return { 
            content: [{ 
              type: "text", 
              text: `Error analyzing tweets: ${result.error}` 
            }],
            isError: true
          };
        }
        
        // Si pas de résultat, retourner un message approprié
        if (!result.result) {
          return { 
            content: [{ 
              type: "text", 
              text: "Analysis completed but no results were returned" 
            }]
          };
        }
        
        // Formater le résultat
        let formattedResult = `# Tweet Analysis\n\n`;
        formattedResult += `Analysis prompt: "${prompt}"\n\n`;
        formattedResult += `Analyzed ${tweetArray.length} tweet${tweetArray.length > 1 ? 's' : ''}\n\n`;
        formattedResult += `## Analysis Results\n\n${result.result}\n\n`;
        
        // Ajouter quelques tweets d'exemple
        formattedResult += `## Sample Tweets\n\n`;
        tweetArray.slice(0, 5).forEach((tweet, index) => {
          formattedResult += `### Tweet ${index + 1}\n\n${tweet}\n\n`;
        });
        
        if (tweetArray.length > 5) {
          formattedResult += `... and ${tweetArray.length - 5} more tweets\n`;
        }
        
        // Retourner le contenu formaté
        return { 
          content: [{ 
            type: "text", 
            text: formattedResult 
          }]
        };
      } catch (error) {
        logger.error('Error in analyze_tweets tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error analyzing tweets: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil de recherche par similarité
  server.tool(
    'similarity_search',
    {
      query: z.string().min(1, 'Query is required'),
      keywords: z.array(z.string()).optional(),
      maxResults: z.number().min(1).max(100).optional(),
      namespace: z.string().optional()
    },
    async (params) => {
      try {
        const { query, keywords, maxResults, namespace } = params;
        
        logger.info(`Performing similarity search: ${query}`);
        
        // Construire la requête
        const request = {
          query,
          keywords,
          maxResults: maxResults || 10,
          namespace
        };
        
        // Exécuter la recherche
        const result = await masaService.searchBySimilarity(request);
        
        // Vérifier s'il y a une erreur
        if (result.error) {
          return { 
            content: [{ 
              type: "text", 
              text: `Error in similarity search: ${result.error}` 
            }],
            isError: true
          };
        }
        
        // Si aucun résultat, retourner un message approprié
        if (!result.results || result.results.length === 0) {
          return { 
            content: [{ 
              type: "text", 
              text: `No results found for similarity search: "${query}"` 
            }]
          };
        }
        
        // Formater le résultat
        let formattedResult = `# Similarity Search Results\n\n`;
        formattedResult += `Query: "${query}"\n`;
        
        if (keywords && keywords.length > 0) {
          formattedResult += `Keywords: ${keywords.join(', ')}\n`;
        }
        
        formattedResult += `Namespace: ${namespace || 'twitter'}\n`;
        formattedResult += `Found ${result.results.length} of ${result.total} total results\n\n`;
        formattedResult += `## Results\n\n`;
        
        // Formater chaque résultat
        result.results.forEach((item, index) => {
          formattedResult += `### Result ${index + 1} (Similarity: ${(item.similarity * 100).toFixed(1)}%)\n\n`;
          formattedResult += `${item.text}\n\n`;
          
          // Ajouter des métadonnées supplémentaires si disponibles
          const metadata = [];
          if (item.id) metadata.push(`ID: ${item.id}`);
          if (item.username) metadata.push(`Username: ${item.username}`);
          if (item.date) metadata.push(`Date: ${item.date}`);
          
          if (metadata.length > 0) {
            formattedResult += `*${metadata.join(' | ')}*\n\n`;
          }
        });
        
        // Retourner le contenu formaté
        return { 
          content: [{ 
            type: "text", 
            text: formattedResult 
          }]
        };
      } catch (error) {
        logger.error('Error in similarity_search tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error performing similarity search: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Data analysis tools registered');
}