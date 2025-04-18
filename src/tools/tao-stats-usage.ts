// tao-stats-usage.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import logger from '../utils/logger';
import { BittensorService } from '../services/bittensor-service';
import { env } from '../config/env';

/**
 * Enregistre l'outil de statistiques d'utilisation de l'API TaoStats
 * @param server Instance du serveur MCP
 * @param bittensorService Service Bittensor à utiliser
 */
export function registerTaoStatsUsageTool(
  server: McpServer,
  bittensorService: BittensorService
): void {
  // Vérifier si le service implémente l'interface étendue avec les statistiques
  const hasCacheStats = (bittensorService as any).getApiUsageStats !== undefined;
  
  // Outil pour afficher les statistiques d'utilisation de l'API TaoStats
  server.tool(
    'tao_stats_usage',
    {},
    async () => {
      try {
        logger.info('tao_stats_usage tool called');
        
        // Si le service n'a pas la méthode, utiliser une réponse générique
        if (!hasCacheStats) {
          return {
            content: [{ 
              type: "text", 
              text: `TaoStats API Usage Information

The current version of the Bittensor service doesn't provide API usage statistics. 
This is either because:
- The service is using the legacy API implementation without caching
- Bittensor functionality is disabled

For optimal API usage:
1. Ensure you're using the latest BittensorCachedApiService
2. Verify TAO_STAT_API_KEY is correctly set in your .env file
3. Set TAO_STAT_MINUTE_LIMIT in your .env file (default: 5)` 
            }]
          };
        }
        
        // Récupérer les statistiques d'utilisation
        const stats = (bittensorService as any).getApiUsageStats();
        
        // Obtenir la limite de requêtes par minute depuis l'environnement ou la valeur par défaut
        const minuteLimit = (env.TAO_STAT_MINUTE_LIMIT || '5', 10);
        
        // Formater la réponse avec les nouvelles statistiques par minute
        return {
          content: [{ 
            type: "text", 
            text: `TaoStats API Usage Information

API Calls: ${stats.currentMinuteRequests}/${minuteLimit} (in current minute window)
Remaining Calls: ${stats.apiCallsRemaining}
Next window reset in: ${stats.windowResetTime}
Cache Entries: ${stats.size}

API limits: Maximum ${minuteLimit} requests per minute.
The current implementation uses a sophisticated cache system to minimize API calls.

Recommendations:
1. Keep the server running to benefit from cached data
2. For higher API limits, consider upgrading your TaoStats API plan
3. Set TAO_STAT_MINUTE_LIMIT in your .env file to match your actual API plan limit` 
          }]
        };
      } catch (error) {
        logger.error('Error in tao_stats_usage tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving TaoStats API usage: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('TaoStats usage tool registered');
}