import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MasaService } from '../services/masa-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil de scraping web dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param masaService Service Masa à utiliser
 */
export function registerWebScrapingTool(
  server: McpServer,
  masaService: MasaService
): void {
  // Outil de scraping web simple
  server.tool(
    'web_scrape',
    {
      url: z.string().url('URL must be valid'),
      format: z.enum(['text', 'html', 'json']).optional()
    },
    async (params) => {
      try {
        const { url, format } = params;
        
        logger.info(`Executing web scraping: ${url}`);
        
        // Construire la requête
        const request = {
          url,
          format: format || 'text'
        };
        
        // Exécuter le scraping
        const result = await masaService.scrapeWeb(request);
        
        // Vérifier s'il y a une erreur
        if (result.error) {
          return { 
            content: [{ 
              type: "text", 
              text: `Error scraping web page: ${result.error}` 
            }],
            isError: true
          };
        }
        
        // Si pas de contenu, retourner un message approprié
        if (!result.content) {
          return { 
            content: [{ 
              type: "text", 
              text: `No content found for URL: ${url}` 
            }]
          };
        }
        
        // Formatage du contenu
        const title = result.title ? `# ${result.title}\n\n` : '';
        const contentSummary = `Content length: ${result.content.length} characters`;
        
        // Limiter la taille du contenu pour éviter les problèmes de taille
        let contentPreview = result.content;
        if (contentPreview.length > 2000) {
          contentPreview = contentPreview.substring(0, 2000) + '... [content truncated, total length: ' + result.content.length + ' characters]';
        }
        
        // Formatage des métadonnées
        const metadata = result.metadata && Object.keys(result.metadata).length > 0
          ? `\n\n## Metadata\n\n${JSON.stringify(result.metadata, null, 2)}`
          : '';
        
        // Retourner le contenu formaté
        return { 
          content: [{ 
            type: "text", 
            text: `${title}Source: ${url}\n${contentSummary}\n\n${contentPreview}${metadata}` 
          }]
        };
      } catch (error) {
        logger.error('Error in web_scrape tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error scraping web page: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil de scraping web avancé
  server.tool(
    'web_scrape_advanced',
    {
      url: z.string().url('URL must be valid'),
      depth: z.number().min(1).max(3).optional(),
      extractImages: z.boolean().optional(),
      extractLinks: z.boolean().optional(),
      selector: z.string().optional()
    },
    async (params) => {
      try {
        const { url, depth, extractImages, extractLinks, selector } = params;
        
        logger.info(`Executing advanced web scraping: ${url}`);
        
        // Construire la requête
        const request = {
          url,
          depth: depth || 1,
          format: 'html' as 'text' | 'html' | 'json' // Le format HTML permet d'extraire plus d'informations
        };
        
        // Exécuter le scraping
        const result = await masaService.scrapeWeb(request);
        
        // Vérifier s'il y a une erreur
        if (result.error) {
          return { 
            content: [{ 
              type: "text", 
              text: `Error scraping web page: ${result.error}` 
            }],
            isError: true
          };
        }
        
        // Si pas de contenu, retourner un message approprié
        if (!result.content) {
          return { 
            content: [{ 
              type: "text", 
              text: `No content found for URL: ${url}` 
            }]
          };
        }
        
        // Préparation du résultat
        let formattedResult = `# ${result.title || url}\n\n`;
        formattedResult += `Source: ${url}\n`;
        formattedResult += `Content length: ${result.content.length} characters\n\n`;
        
        // Limiter la taille du contenu pour éviter les problèmes de taille
        let contentPreview = result.content;
        if (contentPreview.length > 2000) {
          contentPreview = contentPreview.substring(0, 2000) + '... [content truncated]';
        }
        
        formattedResult += contentPreview + '\n\n';
        
        // Ajouter les métadonnées
        if (result.metadata && Object.keys(result.metadata).length > 0) {
          formattedResult += `## Metadata\n\n${JSON.stringify(result.metadata, null, 2)}\n\n`;
        }
        
        // Extraction d'informations supplémentaires si demandé
        // Note: cette partie est simulée car l'API ne fournit pas directement ces fonctionnalités
        if (extractLinks) {
          const links = extractLinksFromHTML(result.content);
          if (links.length > 0) {
            formattedResult += `## Links (${links.length})\n\n`;
            links.slice(0, 20).forEach(link => {
              formattedResult += `- [${link.text || link.url}](${link.url})\n`;
            });
            if (links.length > 20) {
              formattedResult += `... and ${links.length - 20} more links\n`;
            }
            formattedResult += '\n';
          }
        }
        
        if (extractImages) {
          const images = extractImagesFromHTML(result.content);
          if (images.length > 0) {
            formattedResult += `## Images (${images.length})\n\n`;
            images.slice(0, 10).forEach(image => {
              formattedResult += `- ![${image.alt || 'Image'}](${image.src})\n`;
            });
            if (images.length > 10) {
              formattedResult += `... and ${images.length - 10} more images\n`;
            }
            formattedResult += '\n';
          }
        }
        
        // Retourner le contenu formaté
        return { 
          content: [{ 
            type: "text", 
            text: formattedResult 
          }]
        };
      } catch (error) {
        logger.error('Error in web_scrape_advanced tool:', error);
        return { 
          content: [{ 
            type: "text", 
            text: `Error with advanced web scraping: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Web scraping tools registered');
}

/**
 * Fonctions utilitaires pour extraire des informations du HTML
 * Note: Ces fonctions sont basiques et servent principalement d'illustration
 */

// Fonction pour extraire des liens d'un contenu HTML
function extractLinksFromHTML(html: string): Array<{url: string; text?: string}> {
  try {
    const links: Array<{url: string; text?: string}> = [];
    
    // Extraction basique avec regex (simplifié pour l'exemple)
    // Note: dans un cas réel, il serait préférable d'utiliser une bibliothèque comme cheerio
    const linkMatches = html.match(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"(?:[^>]*?)>([^<]*)<\/a>/gi);
    
    if (linkMatches) {
      linkMatches.forEach(match => {
        const hrefMatch = match.match(/href="([^"]*)"/i);
        const textMatch = match.match(/>([^<]*)</i);
        
        if (hrefMatch && hrefMatch[1]) {
          const url = hrefMatch[1];
          const text = textMatch && textMatch[1] ? textMatch[1].trim() : undefined;
          
          links.push({ url, text });
        }
      });
    }
    
    return links;
  } catch (error) {
    logger.error('Error extracting links:', error);
    return [];
  }
}

// Fonction pour extraire des images d'un contenu HTML
function extractImagesFromHTML(html: string): Array<{src: string; alt?: string}> {
  try {
    const images: Array<{src: string; alt?: string}> = [];
    
    // Extraction basique avec regex (simplifié pour l'exemple)
    const imageMatches = html.match(/<img\s+[^>]*?src="([^"]*)"[^>]*?>/gi);
    
    if (imageMatches) {
      imageMatches.forEach(match => {
        const srcMatch = match.match(/src="([^"]*)"/i);
        const altMatch = match.match(/alt="([^"]*)"/i);
        
        if (srcMatch && srcMatch[1]) {
          const src = srcMatch[1];
          const alt = altMatch && altMatch[1] ? altMatch[1].trim() : undefined;
          
          images.push({ src, alt });
        }
      });
    }
    
    return images;
  } catch (error) {
    logger.error('Error extracting images:', error);
    return [];
  }
}