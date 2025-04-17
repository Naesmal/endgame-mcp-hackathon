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
        logger.info(`Scraping web page: ${url} in ${format} format (Mode: ${env.MASA_MODE})`);
        
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
        
        // Journaliser pour débogage
        logger.debug(`Scrape result: ${JSON.stringify(scrapeResult)}`);
        
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
        
        // Formater la réponse selon le mode
        if (env.MASA_MODE === 'API') {
          // Format API - utilise title et content directement
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
        } else {
          // Format PROTOCOL
          // Traiter la structure de données spécifique au PROTOCOL
          let title = 'Web Page Content';
          let formattedContent = '';
          
          try {
            // Journaliser la structure pour débogage
            logger.debug(`PROTOCOL response structure: ${Object.keys(scrapeResult).join(', ')}`);
            
            // Vérifier si les données sont sous forme d'objet avec propriété 'data'
            if (scrapeResult && typeof scrapeResult === 'object' && 'data' in scrapeResult) {
              const data = (scrapeResult as any).data;
              
              // Extraire et organiser les pages (liens)
              if (data && data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
                formattedContent += "## Pages découvertes\n";
                
                // Limiter à 15 liens pour ne pas surcharger
                const pagesToShow = Math.min(data.pages.length, 15);
                
                for (let i = 0; i < pagesToShow; i++) {
                  formattedContent += `- ${String(data.pages[i])}\n`;
                }
                
                if (data.pages.length > 15) {
                  formattedContent += `... et ${data.pages.length - 15} autres pages\n`;
                }
                
                formattedContent += "\n";
              }
              
              // Extraire et organiser les sections
              if (data && data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
                formattedContent += "## Sections du contenu\n\n";
                
                data.sections.forEach((section: any, index: number) => {
                  // Section avec titre
                  if (section.title) {
                    formattedContent += `### ${section.title}\n\n`;
                    
                    // Utiliser le premier titre comme titre principal
                    if (index === 0) {
                      title = section.title;
                    }
                  }
                  
                  // Paragraphes
                  if (section.paragraphs && Array.isArray(section.paragraphs)) {
                    section.paragraphs.forEach((para: any) => {
                      if (para) {
                        formattedContent += `${String(para)}\n\n`;
                      }
                    });
                  }
                  
                  // Images
                  if (section.images && Array.isArray(section.images) && section.images.length > 0) {
                    formattedContent += "**Images:**\n";
                    section.images.forEach((img: any) => {
                      formattedContent += `- ${String(img)}\n`;
                    });
                    formattedContent += "\n";
                  }
                });
              }
              
              // Ajouter des informations sur le nombre d'enregistrements
              if ('recordCount' in scrapeResult) {
                formattedContent += `\n## Informations\n`;
                formattedContent += `- Nombre d'enregistrements traités: ${(scrapeResult as any).recordCount}\n`;
                formattedContent += `- Profondeur de l'exploration: ${requestOptions.depth || 1}\n`;
              }
            } else {
              // Fallback si la structure n'est pas celle attendue
              formattedContent = "Cette page a été scrapée avec succès, mais la structure des données n'est pas standard. Voici les données brutes:\n\n";
              formattedContent += `\`\`\`json\n${JSON.stringify(scrapeResult, null, 2)}\n\`\`\``;
            }
          } catch (parseError) {
            // En cas d'erreur de parsing
            logger.error("Error parsing scrapeResult:", parseError);
            formattedContent = `Erreur lors du traitement des données:\n${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}\n\nDonnées brutes: ${JSON.stringify(scrapeResult)}`;
          }
          
          // S'il n'y a toujours pas de contenu, afficher un message explicite
          if (!formattedContent) {
            formattedContent = "Aucun contenu n'a pu être extrait de cette page.";
          }
          
          return {
            content: [{
              type: 'text',
              text: `# ${title}\n\nSource: ${url}\nMode: PROTOCOL\n\n${formattedContent}`
            }]
          };
        }
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
        
        // Effectuer le scraping avancé avec depth spécifié
        const scrapeResult = await masaService.scrapeWeb({
          url,
          depth
        });
        
        // Journaliser pour débogage
        logger.debug(`Advanced scrape result: ${JSON.stringify(scrapeResult)}`);
        
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
        
        // Traiter la réponse au format PROTOCOL
        let title = 'Web Page Content';
        let formattedContent = '';
        let linksSection = '';
        
        try {
          // Vérifier la structure de données
          if (scrapeResult && typeof scrapeResult === 'object' && 'data' in scrapeResult) {
            const data = (scrapeResult as any).data;
            
            // Traiter les liens si demandé
            if (extractLinks && data && data.pages && Array.isArray(data.pages)) {
              linksSection = '\n\n## Tous les liens découverts\n';
              
              // Créer une liste sans doublons
              const uniqueLinks = [...new Set(data.pages.map((link: any) => String(link)))];
              
              // Limiter le nombre de liens affichés
              const linksToShow = Math.min(uniqueLinks.length, 50);
              
              for (let i = 0; i < linksToShow; i++) {
                linksSection += `- ${uniqueLinks[i]}\n`;
              }
              
              if (uniqueLinks.length > 50) {
                linksSection += `\n... et ${uniqueLinks.length - 50} autres liens non affichés ...\n`;
              }
            }
            
            // Traiter les sections
            if (data && data.sections && Array.isArray(data.sections)) {
              // Afficher le nombre de sections
              formattedContent += `## Contenu (${data.sections.length} sections)\n\n`;
              
              data.sections.forEach((section: any, index: number) => {
                if (section.title) {
                  formattedContent += `### ${section.title}\n\n`;
                  
                  // Utiliser le premier titre significatif comme titre principal
                  if (index === 0 || (index === 1 && title === 'Web Page Content')) {
                    title = section.title;
                  }
                }
                
                // Paragraphes
                if (section.paragraphs && Array.isArray(section.paragraphs)) {
                  section.paragraphs.forEach((para: any) => {
                    if (para) {
                      formattedContent += `${String(para)}\n\n`;
                    }
                  });
                } else if (section.paragraphs === null) {
                  formattedContent += "*Section sans paragraphes*\n\n";
                }
                
                // Images
                if (section.images && Array.isArray(section.images) && section.images.length > 0) {
                  formattedContent += "**Images:**\n";
                  section.images.forEach((img: any) => {
                    formattedContent += `- ${String(img)}\n`;
                  });
                  formattedContent += "\n";
                }
              });
            }
            
            // Ajouter des statistiques de scraping
            formattedContent += `\n## Statistiques de scraping\n`;
            
            // Nombre de pages
            if (data && data.pages) {
              formattedContent += `- Pages découvertes: ${data.pages.length}\n`;
            }
            
            // Profondeur & enregistrements
            formattedContent += `- Profondeur d'exploration: ${depth}\n`;
            
            if ('recordCount' in scrapeResult) {
              formattedContent += `- Enregistrements traités: ${(scrapeResult as any).recordCount}\n`;
            }
          } else {
            // Fallback pour les données non structurées
            formattedContent = "Les données de cette page ne sont pas dans le format attendu. Voici les données brutes:\n\n";
            formattedContent += `\`\`\`json\n${JSON.stringify(scrapeResult, null, 2)}\n\`\`\``;
          }
        } catch (parseError) {
          // En cas d'erreur de parsing
          logger.error("Error parsing advanced scrapeResult:", parseError);
          formattedContent = `Erreur lors du traitement des données:\n${parseError instanceof Error ? parseError.message : 'Erreur inconnue'}\n\nDonnées brutes: ${JSON.stringify(scrapeResult)}`;
        }
        
        // S'il n'y a toujours pas de contenu, afficher un message explicite
        if (!formattedContent) {
          formattedContent = "Aucun contenu n'a pu être extrait de cette page.";
        }
        
        return {
          content: [{
            type: 'text',
            text: `# ${title}\n\nSource: ${url}\nProfondeur: ${depth}\nMode: PROTOCOL${linksSection}\n\n${formattedContent}`
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