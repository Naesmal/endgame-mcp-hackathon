// data-analysis.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import { z } from 'zod';
import logger from '../utils/logger';
import { env } from '../config/env';

/**
 * Enregistre l'outil d'extraction de termes de recherche (uniquement compatible API)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerTermExtractionTool(server: McpServer, masaService: MasaService): void {
  // Vérifier que nous sommes en mode API
  if (env.MASA_MODE !== 'API') {
    logger.warn('Term extraction tool is only available in API mode');
    return;
  }
  
  server.tool(
    'extract_search_terms',
    {
      userInput: z.string().describe('Prompt utilisateur décrivant ce qu\'il recherche'),
      count: z.number().min(1).max(10).default(3).optional().describe('Nombre de termes à extraire')
    },
    async ({ userInput, count = 3 }) => {
      try {
        logger.info(`Extracting search terms from: "${userInput}"`);
        
        // Appeler le service d'extraction
        const extractionResult = await masaService.extractSearchTerms({
          userInput,
          count
        });
        
        // Vérifier si une erreur s'est produite
        if (extractionResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error extracting search terms: ${extractionResult.error}`
            }]
          };
        }
        
        // Formater les résultats
        const searchTerms = extractionResult.searchTerms || [];
        const thinking = extractionResult.thinking || '';
        
        if (searchTerms.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `Could not extract any search terms from: "${userInput}"`
            }]
          };
        }
        
        // Construire la réponse
        let response = `## Search Terms Extracted\n\n`;
        
        searchTerms.forEach((term, index) => {
          response += `${index + 1}. "${term}"\n`;
        });
        
        if (thinking) {
          response += `\n## Thinking Process\n\n${thinking}\n`;
        }
        
        response += `\nThese terms can be used for Twitter searches or data queries.`;
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      } catch (error) {
        logger.error('Error in extract_search_terms tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error extracting search terms: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Term extraction tool registered successfully');
}

/**
 * Enregistre l'outil d'analyse de tweets (uniquement compatible API)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerTweetAnalysisTool(server: McpServer, masaService: MasaService): void {
  // Vérifier que nous sommes en mode API
  if (env.MASA_MODE !== 'API') {
    logger.warn('Tweet analysis tool is only available in API mode');
    return;
  }
  
  server.tool(
    'analyze_tweets',
    {
      tweets: z.union([z.string(), z.array(z.string())]).describe('Tweet(s) à analyser (texte ou tableau)'),
      prompt: z.string().describe('Prompt d\'analyse personnalisé')
    },
    async ({ tweets, prompt }) => {
      try {
        logger.info(`Analyzing tweets with prompt: "${prompt}"`);
        
        // Normaliser les tweets pour que ce soit toujours un tableau
        const tweetsArray = Array.isArray(tweets) ? tweets : [tweets];
        
        // Vérifier qu'il y a des tweets à analyser
        if (tweetsArray.length === 0) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error: No tweets provided for analysis`
            }]
          };
        }
        
        // Appeler le service d'analyse
        const analysisResult = await masaService.analyzeData({
          tweets: tweetsArray,
          prompt
        });
        
        // Vérifier si une erreur s'est produite
        if (analysisResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error analyzing tweets: ${analysisResult.error}`
            }]
          };
        }
        
        // Formatage des tweets pour le contexte
        const tweetContext = tweetsArray.map((tweet, index) => 
          `Tweet ${index + 1}: "${tweet}"`
        ).join('\n\n');
        
        // Construire la réponse
        const response = `## Tweet Analysis\n\n${analysisResult.result}\n\n## Analyzed Content\n\n${tweetContext}`;
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      } catch (error) {
        logger.error('Error in analyze_tweets tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error analyzing tweets: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Tweet analysis tool registered successfully');
}

/**
 * Enregistre l'outil de recherche par similarité (uniquement compatible API)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerSimilaritySearchTool(server: McpServer, masaService: MasaService): void {
  // Vérifier que nous sommes en mode API
  if (env.MASA_MODE !== 'API') {
    logger.warn('Similarity search tool is only available in API mode');
    return;
  }
  
  server.tool(
    'similarity_search',
    {
      query: z.string().describe('Requête sémantique'),
      keywords: z.array(z.string()).optional().describe('Mots-clés additionnels (optionnel)'),
      maxResults: z.number().min(1).max(100).default(10).optional().describe('Nombre maximum de résultats'),
      namespace: z.enum(['twitter', 'bittensor']).default('twitter').optional().describe('Espace de données à interroger')
    },
    async ({ query, keywords, maxResults = 10, namespace = 'twitter' }) => {
      try {
        logger.info(`Performing similarity search for: "${query}" in namespace ${namespace}`);
        
        // Appeler le service de recherche par similarité
        const searchResult = await masaService.searchBySimilarity({
          query,
          keywords,
          maxResults,
          namespace
        });
        
        // Vérifier si une erreur s'est produite
        if (searchResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error in similarity search: ${searchResult.error}`
            }]
          };
        }
        
        // Vérifier s'il y a des résultats
        if (searchResult.results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No results found for semantic query: "${query}" in namespace "${namespace}"`
            }]
          };
        }
        
        // Formater les résultats
        let response = `## Semantic Search Results\n\nQuery: "${query}"\nNamespace: ${namespace}\n\n`;
        
        // Ajouter les résultats
        searchResult.results.forEach((result, index) => {
          // Formater le score de similarité
          const similarityScore = result.similarity.toFixed(2);
          
          response += `### Result ${index + 1} (Score: ${similarityScore})\n`;
          
          // Ajouter l'ID si disponible
          if (result.id) {
            response += `ID: ${result.id}\n\n`;
          }
          
          // Ajouter le texte
          response += `${result.text}\n\n`;
        });
        
        // Ajouter les informations sur le nombre total
        const totalMessage = searchResult.total > searchResult.results.length
          ? `Showing ${searchResult.results.length} out of ${searchResult.total} total matches.`
          : `Found ${searchResult.total} matches.`;
        
        response += `---\n${totalMessage}`;
        
        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      } catch (error) {
        logger.error('Error in similarity_search tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error in similarity search: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Similarity search tool registered successfully');
}