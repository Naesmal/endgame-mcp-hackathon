import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre la ressource web dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerWebResource(
  server: McpServer,
  masaService: MasaService
): void {
  // Ressource pour les pages web
  server.resource(
    'web_pages',
    new ResourceTemplate('web://{url}', {
      list: async () => {
        try {
          logger.info('Listing web resources');
          // Retourner au format attendu par MCP pour list
          return {
            resources: [
              {
                uri: 'web://info',
                name: 'Web Resources',
                description: 'Use web://{url} to access web page content (encoded URL)'
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing web resources:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Si une URL est fournie, récupérer son contenu
        if (params.url) {
          logger.info(`Getting web page content for: ${params.url}`);
          
          // Extraire l'URL (gérer le cas où c'est un tableau)
          const urlParam = Array.isArray(params.url) ? params.url[0] : params.url;
          
          // Si l'URL semble être encodée, la décoder
          let url = urlParam;
          if (url.includes('%')) {
            try {
              url = decodeURIComponent(url);
            } catch (e) {
              logger.warn(`Failed to decode URL: ${url}`, e);
              // Continuer avec l'URL telle quelle
            }
          }
          
          // S'assurer que l'URL a un schéma (http/https)
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          
          // Scraper la page web
          const result = await masaService.scrapeWeb({ 
            url: url,
            format: 'text'
          });
          
          // Vérifier si une erreur s'est produite
          if (result.error) {
            return {
              contents: [],
              errorMessage: result.error
            };
          }
          
          // Préparer un titre pour la ressource
          const title = result.title || 'Web Page Content';
          
          // Limiter la taille du contenu si nécessaire
          let content = result.content;
          const MAX_CONTENT_SIZE = 100000; // ~100 KB limit
          
          if (content.length > MAX_CONTENT_SIZE) {
            content = content.substring(0, MAX_CONTENT_SIZE) + 
              '\n\n... [Content truncated due to size limitations. Use the web_scrape tool for more complete results] ...';
          }
          
          return {
            title: title,
            contents: [{
              uri: uri.href,
              text: content
            }]
          };
        }
        
        // Si aucune URL n'est fournie, retourner une liste vide avec un message d'erreur
        return {
          contents: [],
          errorMessage: 'URL is required'
        };
      } catch (error) {
        logger.error('Error in web_pages resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving web page content: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  logger.info('Web pages resource registered successfully');
}