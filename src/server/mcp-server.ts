import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { env, isBittensorEnabled } from '../config/env';
import logger from '../utils/logger';
import { MasaServiceFactory } from '../services/masa-service';
import { BittensorServiceFactory } from '../services/bittensor-service';
import { TransportFactory } from './transport.js';

/**
 * Classe du serveur MCP pour Masa Subnet 42
 * Cette classe gère la configuration du serveur MCP et l'ajout des outils
 */
export class MasaSubnetMcpServer {
  private server: McpServer;
  private transport: any;
  
  constructor() {
    // Créer une instance du serveur MCP
    this.server = new McpServer({
      name: env.MCP_SERVER_NAME,
      version: env.MCP_SERVER_VERSION,
      description: env.MCP_SERVER_DESCRIPTION
    });
    
    logger.info(`Created MCP server: ${env.MCP_SERVER_NAME} v${env.MCP_SERVER_VERSION}`);
  }
  
  /**
   * Initialise le serveur MCP avec les outils et ressources
   */
  async initialize(): Promise<void> {
    try {
      // Créer le service Masa approprié en fonction du mode configuré
      const masaService = await MasaServiceFactory.createService(env.MASA_MODE);
      
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
      // Importer et enregistrer l'outil de recherche Twitter
      const { registerTwitterSearchTool } = await import('../tools/twitter-search.js');
      registerTwitterSearchTool(this.server, masaService);
      
      // Importer et enregistrer l'outil d'indexation de données
      const { registerDataIndexingTool } = await import('../tools/data-indexing.js');
      registerDataIndexingTool(this.server, masaService);
      
      // Nouveaux outils
      // Importer et enregistrer l'outil de scraping web
      const { registerWebScrapingTool } = await import('../tools/web-scraping.js');
      registerWebScrapingTool(this.server, masaService);
      
      // Importer et enregistrer l'outil d'analyse de données
      const { registerDataAnalysisTool } = await import('../tools/data-analysis.js');
      registerDataAnalysisTool(this.server, masaService);
      
      // Enregistrer les outils Bittensor seulement si Bittensor est activé
      if (isBittensorEnabled()) {
        // Importer et enregistrer l'outil d'information Bittensor
        const { registerBittensorInfoTool } = await import('../tools/bittensor-info.js');
        registerBittensorInfoTool(this.server, bittensorService);
        
        // Importer et enregistrer l'outil de recherche Bittensor
        const { registerBittensorSearchTool } = await import('../tools/bittensor-search.js');
        registerBittensorSearchTool(this.server, bittensorService);
      } else {
        // Si Bittensor est désactivé, créer une version simplifiée de subnet_info
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
      }
      
      logger.info('MCP tools registered successfully');
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
      // Importer et enregistrer la ressource de recherche Twitter uniquement
      const { registerDataResource } = await import('../resources/data-resource.js');
      registerDataResource(this.server, masaService);
      
      // Nouvelle ressource web
      const { registerWebResource } = await import('../resources/web-resource.js');
      registerWebResource(this.server, masaService);
      
      // Importer et enregistrer les ressources Bittensor seulement si Bittensor est activé
      if (isBittensorEnabled()) {
        // Enregistrer la ressource principale Bittensor
        const { registerBittensorResource } = await import('../resources/bittensor-resource.js');
        registerBittensorResource(this.server, bittensorService);
        
        // Enregistrer la ressource de données Bittensor (pour data://bittensor)
        const { registerBittensorDataResource } = await import('../resources/bittensor-data.js');
        registerBittensorDataResource(this.server, bittensorService);
        
        logger.info('Bittensor resources registered successfully');
      }
      
      logger.info('MCP resources registered successfully');
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