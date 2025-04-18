// web-scraping.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import { z } from 'zod';
import logger from '../utils/logger';
import { env } from '../config/env';
import { WebScrapeRequest } from '../types';

/**
 * Enregistre l'outil de scraping web basique (compatible API et PROTOCOL)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerWebScrapingTool(server: McpServer, masaService: MasaService): void {
  server.tool(
    'web_scrape',
    {
      url: z.string().describe('URL de la page web à scraper'),
      format: z.enum(['text', 'html']).default('text').optional().describe('Format du contenu à extraire')
    },
    async ({ url, format = 'text' }) => {
      try {
        logger.info(`Scraping web page: ${url} in ${format} format`);
        
        // Vérifier que l'URL est valide
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Adapter la requête en fonction du mode
        let requestOptions: WebScrapeRequest;
        
        if (env.MASA_MODE === 'API') {
          // En mode API, nous utilisons format pour spécifier la sortie
          requestOptions = {
            url,
            format
          };
        } else {
          // En mode PROTOCOL, nous utilisons depth=1 par défaut
          requestOptions = {
            url,
            depth: 1
          };
        }
        
        // Effectuer le scraping
        const scrapeResult = await masaService.scrapeWeb(requestOptions);
        
        // Vérifier si une erreur s'est produite
        if (scrapeResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error scraping web page: ${scrapeResult.error}`
            }]
          };
        }
        
        // Formater la réponse
        const title = scrapeResult.title || 'Web Page Content';
        const content = scrapeResult.content || '';
        
        // Limiter la taille du contenu si nécessaire
        const MAX_CONTENT_SIZE = 50000; // ~50 KB limit
        let displayContent = content;
        
        if (content.length > MAX_CONTENT_SIZE) {
          displayContent = content.substring(0, MAX_CONTENT_SIZE) + 
            '\n\n... [Content truncated due to size limitations] ...';
        }
        
        // Ajouter des métadonnées si disponibles
        let metadataSection = '';
        if (scrapeResult.metadata && Object.keys(scrapeResult.metadata).length > 0) {
          metadataSection = '\n\n## Metadata\n';
          
          for (const [key, value] of Object.entries(scrapeResult.metadata)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              metadataSection += `- ${key}: ${value}\n`;
            }
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `# ${title}\n\nSource: ${url}${metadataSection}\n\n## Content\n\n${displayContent}`
          }]
        };
      } catch (error) {
        logger.error('Error in web_scrape tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error scraping web page: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Web scraping tool registered successfully');
}

/**
 * Enregistre l'outil de scraping web avancé (uniquement compatible PROTOCOL)
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerAdvancedWebScrapingTool(server: McpServer, masaService: MasaService): void {
  // Vérifier que nous sommes en mode PROTOCOL
  if (env.MASA_MODE !== 'PROTOCOL') {
    logger.warn('Advanced web scraping tool is only available in PROTOCOL mode');
    return;
  }
  
  server.tool(
    'web_scrape_advanced',
    {
      url: z.string().describe('URL de la page web à scraper'),
      depth: z.number().min(1).max(3).default(1).optional().describe('Profondeur d\'exploration (1-3)'),
      extractLinks: z.boolean().default(false).optional().describe('Extraire les liens de la page')
    },
    async ({ url, depth = 1, extractLinks = false }) => {
      try {
        logger.info(`Advanced scraping web page: ${url} with depth ${depth}`);
        
        // Vérifier que l'URL est valide
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        // Effectuer le scraping avancé
        const scrapeResult = await masaService.scrapeWeb({
          url,
          depth
        });
        
        // Vérifier si une erreur s'est produite
        if (scrapeResult.error) {
          return {
            isError: true,
            content: [{
              type: 'text',
              text: `Error in advanced web scraping: ${scrapeResult.error}`
            }]
          };
        }
        
        // Formater la réponse
        const title = scrapeResult.title || 'Web Page Content';
        const content = scrapeResult.content || '';
        
        // Limiter la taille du contenu si nécessaire
        const MAX_CONTENT_SIZE = 50000; // ~50 KB limit
        let displayContent = content;
        
        if (content.length > MAX_CONTENT_SIZE) {
          displayContent = content.substring(0, MAX_CONTENT_SIZE) + 
            '\n\n... [Content truncated due to size limitations] ...';
        }
        
        // Extraire les liens si demandé
        let linksSection = '';
        if (extractLinks) {
          // Extraction basique des liens avec une expression régulière
          const linkRegex = /<a\\s+(?:[^>]*?\\s+)?href="([^"]*)"/gi;
          const links = [];
          let match;
          
          while ((match = linkRegex.exec(content)) !== null) {
            links.push(match[1]);
          }
          
          if (links.length > 0) {
            linksSection = '\n\n## Links Found\n';
            const uniqueLinks = [...new Set(links)]; // Éliminer les doublons
            uniqueLinks.slice(0, 50).forEach(link => { // Limiter à 50 liens
              linksSection += `- ${link}\n`;
            });
            
            if (uniqueLinks.length > 50) {
              linksSection += `\n... [${uniqueLinks.length - 50} more links not shown] ...`;
            }
          }
        }
        
        // Ajouter des métadonnées si disponibles
        let metadataSection = '';
        if (scrapeResult.metadata && Object.keys(scrapeResult.metadata).length > 0) {
          metadataSection = '\n\n## Metadata\n';
          
          for (const [key, value] of Object.entries(scrapeResult.metadata)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              metadataSection += `- ${key}: ${value}\n`;
            }
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: `# ${title}\n\nSource: ${url}\nDepth: ${depth}${metadataSection}${linksSection}\n\n## Content\n\n${displayContent}`
          }]
        };
      } catch (error) {
        logger.error('Error in web_scrape_advanced tool:', error);
        
        return {
          isError: true,
          content: [{
            type: 'text',
            text: `Error in advanced web scraping: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
  
  logger.info('Advanced web scraping tool registered successfully');
}