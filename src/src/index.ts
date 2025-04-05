import { env, isBittensorEnabled } from './config/env';
import { MasaSubnetMcpServer } from './server/mcp-server';
import logger from './utils/logger';

/**
 * Point d'entrée principal de l'application
 * Initialise et démarre le serveur MCP
 */
async function main() {
  try {
    logger.info('Starting Masa Subnet 42 MCP Plugin');
    logger.info(`Mode: ${env.MASA_MODE}`);
    logger.info(`Bittensor functionality is ${isBittensorEnabled() ? 'enabled' : 'disabled'}`);
    
    // Créer une instance du serveur MCP
    const server = new MasaSubnetMcpServer();
    
    // Initialiser le serveur
    await server.initialize();
    
    // Démarrer le serveur avec les options appropriées
    server.start({
      httpPort: process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT) : undefined,
      httpHost: process.env.MCP_HTTP_HOST
    });
    
    // Gérer les signaux de terminaison
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down...');
      server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down...');
      server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Exécuter l'application
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});