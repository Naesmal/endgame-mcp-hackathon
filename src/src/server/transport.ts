import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import { env } from '../config/env';
import logger from '../utils/logger';

/**
 * Classe qui gère les transports pour le serveur MCP
 * Cette classe permet de créer le transport approprié en fonction de la configuration
 */
export class TransportFactory {
  private static transports: { [sessionId: string]: SSEServerTransport } = {};
  private static app: any = null;
  private static server: any = null;
  private static stdioTransport: StdioServerTransport | null = null;

  /**
   * Crée un transport pour le serveur MCP
   * @param options Options supplémentaires pour le transport
   * @returns Transport pour le serveur MCP
   */
  static createTransport(options?: { 
    httpPort?: number,
    httpHost?: string
  }) {
    const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
    
    switch (transportType.toLowerCase()) {
      case 'http':
        return this.setupHttpTransport(options);
        
      case 'stdio':
      default:
        logger.info('Creating stdio transport');
        // Créer un transport stdio et le stocker pour pouvoir y accéder plus tard
        this.stdioTransport = new StdioServerTransport();
        return this.stdioTransport;
    }
  }

  /**
   * Configure le serveur HTTP et retourne un gestionnaire de transport
   * @param options Options pour le transport HTTP
   */
  private static setupHttpTransport(options?: { 
    httpPort?: number,
    httpHost?: string
  }) {
    const port = options?.httpPort || 3030;
    const host = options?.httpHost || 'localhost';
    
    logger.info(`Setting up HTTP SSE transport on ${host}:${port}`);
    
    // Créer l'application Express si elle n'existe pas déjà
    if (!this.app) {
      this.app = express();
      
      // Pour traiter les données JSON dans les requêtes
      this.app.use(express.json());
      
      // Route de base pour vérifier que le serveur fonctionne
      this.app.get('/', (_: express.Request, res: express.Response) => {
        res.send('Masa Subnet 42 MCP Server running');
      });
      
      // Démarrer le serveur HTTP
      this.server = this.app.listen(port, host, () => {
        logger.info(`HTTP server listening on ${host}:${port}`);
      });
    }
    
    // Retourner un objet de transport qui sera utilisé par mcpServer.connect()
    return {
      type: 'http',
      port,
      host,
      app: this.app,
      transports: this.transports
    };
  }

  /**
   * Configure les routes SSE pour un serveur MCP
   * @param mcpServer Instance du serveur MCP
   * @param httpTransport Transport HTTP configuré
   */
  static setupSSERoutes(mcpServer: any, httpTransport: any) {
    if (httpTransport.type !== 'http') {
      return; // Ne rien faire si ce n'est pas un transport HTTP
    }

    const app = httpTransport.app;
    const transports = httpTransport.transports;

    // Configurer l'endpoint SSE
    app.get('/sse', async (_: express.Request, res: express.Response) => {
      // Créer un transport SSE
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      
      // Configurer la fermeture de la connexion
      res.on('close', () => {
        delete transports[transport.sessionId];
        logger.info(`SSE connection closed for session ${transport.sessionId}`);
      });
      
      logger.info(`New SSE connection established, session ID: ${transport.sessionId}`);
      
      // Connecter le transport au serveur MCP
      await mcpServer.connect(transport);
    });
    
    // Configurer l'endpoint pour les messages
    app.post('/messages', async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      
      if (transport) {
        try {
          await transport.handlePostMessage(req, res);
        } catch (error) {
          logger.error(`Error handling message for session ${sessionId}:`, error);
          res.status(500).send('Internal server error');
        }
      } else {
        res.status(400).send(`No transport found for sessionId: ${sessionId}`);
      }
    });
  }
  
  /**
   * Obtient le transport stdio actuel
   * @returns Le transport stdio ou null s'il n'existe pas
   */
  static getStdioTransport(): StdioServerTransport | null {
    return this.stdioTransport;
  }
  
  /**
   * Envoie un message à l'utilisateur de manière sécurisée
   * Cette méthode n'interfère pas avec la communication JSON du protocole MCP
   * @param message Le message à afficher à l'utilisateur
   */
  static sendUserMessage(message: string): void {
    // Au lieu d'écrire directement sur stderr, utiliser le logger
    // Le logger est configuré pour écrire sur les fichiers et la console
    logger.info(`User message: ${message}`);
  }
  
  /**
   * Arrête le serveur HTTP si actif
   */
  static shutdownServer() {
    if (this.server) {
      logger.info('Shutting down HTTP server');
      this.server.close(() => {
        logger.info('HTTP server successfully closed');
      });
      
      // Fermer toutes les connexions SSE actives
      for (const sessionId in this.transports) {
        try {
          delete this.transports[sessionId];
          logger.info(`Removed SSE connection for session ${sessionId}`);
        } catch (error) {
          logger.error(`Error handling SSE connection for session ${sessionId}:`, error);
        }
      }
    }
  }
}