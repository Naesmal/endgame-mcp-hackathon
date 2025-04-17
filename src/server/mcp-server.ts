// mcp-server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env, isBittensorEnabled } from '../config/env';
import logger from '../utils/logger';
import { MasaServiceFactory } from '../services/masa-service';
import { BittensorServiceFactory } from '../services/bittensor-service';
import { TransportFactory } from './transport.js';
import path from 'path';

/**
 * Classe du serveur MCP pour Masa Subnet 42
 * Cette classe gère la configuration du serveur MCP et l'ajout des outils
 */
export class MasaSubnetMcpServer {
  private server: McpServer;
  private transport: any;
  private registeredTools: string[] = []; // Pour suivre les outils enregistrés
  private registeredResources: string[] = []; // Pour suivre les ressources enregistrées
  
  constructor() {
    // Créer une instance du serveur MCP
    this.server = new McpServer({
      name: env.MCP_SERVER_NAME,
      version: env.MCP_SERVER_VERSION,
      description: env.MCP_SERVER_DESCRIPTION
    });
    
    logger.info(`Created MCP server: ${env.MCP_SERVER_NAME} v${env.MCP_SERVER_VERSION}`);
    
    // Ajouter un gestionnaire global pour les rejets de promesse non gérés
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  }
  
  /**
   * Initialise le serveur MCP avec les outils et ressources
   */
  async initialize(): Promise<void> {
    try {
      // Créer le service Masa approprié en fonction du mode configuré
      const masaService = await MasaServiceFactory.createService(env.MASA_MODE);
      logger.info(`Masa service created in ${env.MASA_MODE} mode`);
      
      // Créer le service Bittensor
      const bittensorService = await BittensorServiceFactory.createService();
      
      // Enregistrer les outils
      await this.registerTools(masaService, bittensorService);
      
      // Enregistrer les ressources
      await this.registerResources(masaService, bittensorService);
      
      logger.info('MCP server initialized successfully');
      if (isBittensorEnabled()) {
        logger.info('Bittensor functionality is enabled');
      } else {
        logger.info('Bittensor functionality is disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize MCP server:', error);
      throw error;
    }
  }
  
  /**
   * Enregistre les outils MCP
   * @param masaService Service Masa à utiliser
   * @param bittensorService Service Bittensor à utiliser
   */
  private async registerTools(masaService: any, bittensorService: any): Promise<void> {
    try {
      logger.info('Starting tools registration...');
      
      // Liste des outils à importer et enregistrer
      const toolsToRegister = [
        { 
          name: 'Twitter search',
          module: '../tools/twitter-search.js',
          func: 'registerTwitterSearchTool',
          registeredTools: ['twitter_search', 'twitter_advanced_search']
        },
        { 
          name: 'Data indexing',
          module: '../tools/data-indexing.js',
          func: 'registerDataIndexingTool',
          registeredTools: ['index_data', 'query_data']
        },
        { 
          name: 'Web scraping',
          module: '../tools/web-scraping.js',
          func: 'registerWebScrapingTool',
          registeredTools: ['web_scrape', 'web_scrape_advanced']
        },
        { 
          name: 'Data analysis',
          module: '../tools/data-analysis.js',
          func: 'registerDataAnalysisTool',
          registeredTools: ['extract_search_terms', 'analyze_tweets', 'similarity_search']
        }
      ];
      
      // Importer et enregistrer chaque module
      for (const tool of toolsToRegister) {
        try {
          logger.info(`Registering ${tool.name} tools...`);
          
          // Tenter d'importer le module
          const moduleImport = await import(tool.module).catch(error => {
            logger.error(`Failed to import ${tool.name} module:`, error);
            return null;
          });
          
          // Vérifier si le module a été importé et contient la fonction d'enregistrement
          if (moduleImport && typeof moduleImport[tool.func] === 'function') {
            // Appeler la fonction d'enregistrement
            moduleImport[tool.func](this.server, masaService);
            
            // Ajouter les outils enregistrés à la liste
            this.registeredTools.push(...tool.registeredTools);
            
            logger.info(`${tool.name} tools registered successfully`);
          } else {
            logger.error(`Invalid ${tool.name} module - missing registration function or module not found`);
          }
        } catch (error) {
          logger.error(`Failed to register ${tool.name} tools:`, error);
        }
      }
      
      // Enregistrer les outils Bittensor seulement si Bittensor est activé
      if (isBittensorEnabled()) {
        try {
          const bittensorTools = [
            { 
              name: 'Bittensor info',
              module: '../tools/bittensor-info.js',
              func: 'registerBittensorInfoTool',
              registeredTools: ['bittensor_info']
            },
            { 
              name: 'Bittensor search',
              module: '../tools/bittensor-search.js',
              func: 'registerBittensorSearchTool',
              registeredTools: ['bittensor_search']
            }
          ];
          
          for (const tool of bittensorTools) {
            try {
              logger.info(`Registering ${tool.name} tools...`);
              
              const moduleImport = await import(tool.module).catch(error => {
                logger.error(`Failed to import ${tool.name} module:`, error);
                return null;
              });
              
              if (moduleImport && typeof moduleImport[tool.func] === 'function') {
                moduleImport[tool.func](this.server, bittensorService);
                this.registeredTools.push(...tool.registeredTools);
                logger.info(`${tool.name} tools registered successfully`);
              } else {
                logger.error(`Invalid ${tool.name} module - missing registration function or module not found`);
              }
            } catch (error) {
              logger.error(`Failed to register ${tool.name} tools:`, error);
            }
          }
        } catch (error) {
          logger.error('Failed to register Bittensor tools:', error);
        }
      } else {
        // Si Bittensor est désactivé, créer une version simplifiée de subnet_info
        logger.info('Registering simplified subnet_info tool (Bittensor disabled)');
        this.server.tool(
          'subnet_info',
          {},
          async () => {
            logger.info('subnet_info tool called (Bittensor disabled)');
            
            return {
              content: [{ 
                type: "text", 
                text: `Subnet: Masa Subnet 42
  Status: active
  Mode: Twitter API and data indexing only
  
  Note: Bittensor functionality is currently disabled. Add TAO_STAT_API_KEY to your .env file to enable it.` 
              }]
            };
          }
        );
        this.registeredTools.push('subnet_info');
      }
      
      // Log les outils enregistrés
      logger.info(`MCP tools registered successfully. Total tools: ${this.registeredTools.length}`);
      logger.info(`Registered tools: ${this.registeredTools.join(', ')}`);
    } catch (error) {
      logger.error('Failed to register MCP tools:', error);
      throw error;
    }
  }
  
  /**
   * Enregistre les ressources MCP
   * @param masaService Service Masa à utiliser
   * @param bittensorService Service Bittensor à utiliser
   */
  private async registerResources(masaService: any, bittensorService: any): Promise<void> {
    try {
      logger.info('Starting resources registration...');
      
      // Ressource pour les recherches Twitter
      try {
        logger.info('Registering Twitter search resource...');
        const dataResourceModule = await import('../resources/data-resource.js');
        if (typeof dataResourceModule.registerDataResource === 'function') {
          dataResourceModule.registerDataResource(this.server, masaService);
          this.registeredResources.push('twitter-search://info');
          logger.info('Twitter searches resource registered successfully');
        } else {
          logger.error('Invalid data resource module - missing registration function');
        }
      } catch (error) {
        logger.error('Failed to register Twitter search resource:', error);
      }
      
      // Ressource pour les pages web
      try {
        logger.info('Registering web resource...');
        const webResourceModule = await import('../resources/web-resource.js');
        if (typeof webResourceModule.registerWebResource === 'function') {
          webResourceModule.registerWebResource(this.server, masaService);
          this.registeredResources.push('web://info');
          logger.info('Web pages resource registered successfully');
        } else {
          logger.error('Invalid web resource module - missing registration function');
        }
      } catch (error) {
        logger.error('Failed to register web resource:', error);
      }
      
      // Ressources Bittensor (si activé)
      if (isBittensorEnabled()) {
        try {
          logger.info('Registering Bittensor resources...');
          
          // Ressource principale Bittensor
          const bittensorResourceModule = await import('../resources/bittensor-resource.js');
          bittensorResourceModule.registerBittensorResource(this.server, bittensorService);
          this.registeredResources.push('bittensor-subnet://list', 'bittensor-neuron://info', 'bittensor-network://stats');
          
          // Ressource de données Bittensor
          const bittensorDataModule = await import('../resources/bittensor-data.js');
          bittensorDataModule.registerBittensorDataResource(this.server, bittensorService);
          this.registeredResources.push('data://bittensor');
          
          logger.info('Bittensor resources registered successfully');
        } catch (error) {
          logger.error('Failed to register Bittensor resources:', error);
        }
      }
      
      // Log les ressources enregistrées
      logger.info(`MCP resources registered successfully. Total resources: ${this.registeredResources.length}`);
      logger.info(`Registered resources: ${this.registeredResources.join(', ')}`);
    } catch (error) {
      logger.error('Failed to register MCP resources:', error);
      throw error;
    }
  }
  
  /**
   * Démarre le serveur MCP
   */
  start(options?: { httpPort?: number, httpHost?: string }): void {
    try {
      logger.info('Starting MCP server...');
      
      // Configurer le transport en utilisant la factory
      this.transport = TransportFactory.createTransport(options);
      
      const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
      
      if (transportType.toLowerCase() === 'http') {
        // Pour le transport HTTP, configurons les routes SSE
        TransportFactory.setupSSERoutes(this.server, this.transport);
        logger.info('HTTP SSE routes configured');
        logger.info('MCP server is ready to accept connections via SSE');
        
        // Utiliser sendUserMessage pour afficher le message sans perturber la communication JSON
        TransportFactory.sendUserMessage('Masa Subnet 42 MCP Server started with HTTP transport. Press Ctrl+C to stop.');
      } else {
        // Pour les autres transports (stdio), connecter directement
        this.server.connect(this.transport);
        logger.info('MCP server started with stdio transport');
        
        // Utiliser sendUserMessage pour afficher le message sans perturber la communication JSON
        TransportFactory.sendUserMessage('Masa Subnet 42 MCP Server started with stdio transport. Press Ctrl+C to stop.');
      }
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }
  
  /**
   * Arrête le serveur MCP
   */
  stop(): void {
    try {
      // Méthode d'arrêt dépend du type de transport
      const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
      
      if (transportType.toLowerCase() === 'http') {
        // Pour HTTP, fermer le serveur et les connexions SSE
        logger.info('Closing HTTP server and SSE connections');
        TransportFactory.shutdownServer();
      } else {
        // Pour les autres transports (stdio), il n'y a pas de méthode de déconnexion explicite
        // Dans le cas de stdio, le processus se termine naturellement
        logger.info('Stopping stdio transport');
      }
      
      logger.info('MCP server stopped');
    } catch (error) {
      logger.error('Failed to stop MCP server:', error);
      throw error;
    }
  }
}