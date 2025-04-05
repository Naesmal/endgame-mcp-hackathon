import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BittensorService } from '../services/bittensor-service';
import logger from '../utils/logger';

/**
 * Enregistre la ressource Bittensor dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param bittensorService Service Bittensor à utiliser
 */
export function registerBittensorResource(
  server: McpServer,
  bittensorService: BittensorService
): void {
  // Ressource pour les subnets Bittensor
  server.resource(
    'bittensor_subnets',
    new ResourceTemplate('bittensor-subnet://{netuid}', {
      list: async () => {
        try {
          logger.info('Listing Bittensor subnets (static list)');
          
          const resources = [];
          
          // Ajouter une ressource générique qui servira d'entrée pour tous les subnets
          resources.push({
            uri: 'bittensor-subnet://list',
            name: 'All Subnets',
            description: 'List of all Bittensor subnets'
          });
          
          // Ajouter quelques subnets importants (statiques)
          for (let i = 0; i <= 30; i++) {
            resources.push({
              uri: `bittensor-subnet://${i}`,
              name: `Subnet ${i}`,
              description: `Bittensor subnet with ID ${i}`
            });
          }
          
          return { resources };
        } catch (error) {
          logger.error('Error creating static Bittensor subnet list:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Si un ID de subnet est fourni, récupérer les informations spécifiques
        if (params.netuid) {
          logger.info(`Getting Bittensor subnet info for ID: ${params.netuid}`);
          
          // Récupérer les informations du subnet
          const netuid = parseInt(Array.isArray(params.netuid) ? params.netuid[0] : params.netuid);
          const subnet = await bittensorService.getSubnetInfo(netuid);
          
          if (Array.isArray(subnet)) {
            return {
              contents: [],
              errorMessage: `Multiple subnets found for ID: ${netuid}`
            };
          }
          
          // Récupérer les nœuds du subnet (top 10)
          const nodes = await bittensorService.getSubnetNodes(netuid, 10);
          
          // Créer le contenu de la réponse
          const contents = [
            {
              uri: `bittensor-subnet://${netuid}/info`,
              text: `Subnet ${netuid}: ${subnet.name || 'Unnamed'} - ${subnet.totalValidators} validators, ${subnet.totalMiners} miners`
            },
            {
              uri: `bittensor-subnet://${netuid}/stats`,
              text: `Stats: ${subnet.totalStake.toFixed(2)} τ total stake, emission rate: ${subnet.emissionRate.toFixed(6)} τ/block`
            }
          ];
          
          // Ajouter les nœuds principaux
          nodes.forEach((node, index) => {
            contents.push({
              uri: `bittensor-subnet://${netuid}/node/${node.hotkey}`,
              text: `${index + 1}. ${node.type === 'validator' ? 'Validator' : 'Miner'}: ${node.hotkey.slice(0, 16)}... - Stake: ${node.stake.toFixed(2)} τ, Rank: ${node.rank.toFixed(4)}`
            });
          });
          
          return {
            title: `Bittensor Subnet ${netuid} (${subnet.name || 'Unnamed'})`,
            contents
          };
        }
        
        // Si aucun ID de subnet n'est fourni, retourner la liste des subnets
        logger.info('Listing all Bittensor subnets');
        
        const subnets = await bittensorService.getSubnetInfo();
        
        if (!Array.isArray(subnets)) {
          return {
            contents: [],
            errorMessage: 'Failed to retrieve subnet list'
          };
        }
        
        // Trier les subnets par ID
        const sortedSubnets = [...subnets].sort((a, b) => a.netuid - b.netuid);
        
        return {
          title: 'Bittensor Subnets',
          contents: sortedSubnets.map(subnet => ({
            uri: `bittensor-subnet://${subnet.netuid}`,
            text: `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'} - ${subnet.totalValidators} validators, ${subnet.totalMiners} miners, ${subnet.totalStake.toFixed(2)} τ total stake`
          }))
        };
      } catch (error) {
        logger.error('Error in bittensor_subnets resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving Bittensor subnet information: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  // Ressource pour les neurones Bittensor
  server.resource(
    'bittensor_neurons',
    new ResourceTemplate('bittensor-neuron://{subnet}/{hotkey}', {
      list: async () => {
        try {
          logger.info('Listing Bittensor neurons');
          
          // Récupérer tous les subnets
          const subnets = await bittensorService.getSubnetInfo();
          
          if (!Array.isArray(subnets)) {
            return { resources: [] };
          }
          
          // Sélectionner un échantillon de subnets pour éviter trop de ressources
          const sampleSubnets = subnets.slice(0, 5);
          
          // Retourner les ressources de base
          return {
            resources: [
              {
                uri: 'bittensor-neuron://info',
                name: 'Bittensor Neurons',
                description: 'Access neurons information by subnet and hotkey using bittensor-neuron://{subnet}/{hotkey}'
              },
              ...sampleSubnets.map(subnet => ({
                uri: `bittensor-neuron://${subnet.netuid}`,
                name: `Subnet ${subnet.netuid} Neurons`,
                description: `Neurons in ${subnet.name || `Subnet ${subnet.netuid}`}`
              }))
            ]
          };
        } catch (error) {
          logger.error('Error listing Bittensor neurons:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Si à la fois subnet et hotkey sont fournis, récupérer les informations du neurone spécifique
        if (params.subnet && params.hotkey) {
          logger.info(`Getting Bittensor neuron info for hotkey ${params.hotkey} in subnet ${params.subnet}`);
          
          // Récupérer les informations du neurone
          const subnet = parseInt(Array.isArray(params.subnet) ? params.subnet[0] : params.subnet);
          const hotkey = Array.isArray(params.hotkey) ? params.hotkey[0] : params.hotkey;
          
          const neuron = await bittensorService.getNeuronInfo(hotkey, subnet);
          
          // Créer le contenu de la réponse
          return {
            title: `Bittensor Neuron ${hotkey.slice(0, 8)}... in Subnet ${subnet}`,
            contents: [
              {
                uri: `bittensor-neuron://${subnet}/${hotkey}/info`,
                text: `Type: ${neuron.type}, UID: ${neuron.uid}, Stake: ${neuron.stake.toFixed(2)} τ`
              },
              {
                uri: `bittensor-neuron://${subnet}/${hotkey}/performance`,
                text: `Performance: Rank ${neuron.rank.toFixed(4)}, Emission ${neuron.emission.toFixed(6)} τ, Trust ${neuron.trust.toFixed(4)}`
              },
              {
                uri: `bittensor-neuron://${subnet}/${hotkey}/owner`,
                text: `Owner: Coldkey ${neuron.coldkey}`
              }
            ]
          };
        }
        
        // Si seulement subnet est fourni, lister les neurones de ce subnet
        if (params.subnet) {
          logger.info(`Listing neurones for Bittensor subnet ${params.subnet}`);
          
          // Récupérer les nœuds du subnet
          const subnet = parseInt(Array.isArray(params.subnet) ? params.subnet[0] : params.subnet);
          const nodes = await bittensorService.getSubnetNodes(subnet, 20);
          
          if (nodes.length === 0) {
            return {
              contents: [],
              errorMessage: `No neurons found for subnet ${subnet}`
            };
          }
          
          // Trier les nœuds par rang
          const sortedNodes = [...nodes].sort((a, b) => b.rank - a.rank);
          
          // Formater la réponse
          return {
            title: `Bittensor Neurons in Subnet ${subnet}`,
            contents: sortedNodes.map(node => ({
              uri: `bittensor-neuron://${subnet}/${node.hotkey}`,
              text: `${node.type === 'validator' ? 'Validator' : 'Miner'}: ${node.hotkey.slice(0, 16)}... - Rank: ${node.rank.toFixed(4)}, Stake: ${node.stake.toFixed(2)} τ`
            }))
          };
        }
        
        // Si rien n'est fourni, retourner une liste des subnets pour la navigation
        logger.info('Listing Bittensor subnets for neuron navigation');
        
        const subnets = await bittensorService.getSubnetInfo();
        
        if (!Array.isArray(subnets)) {
          return {
            contents: [],
            errorMessage: 'Failed to retrieve subnet list'
          };
        }
        
        // Trier les subnets par ID
        const sortedSubnets = [...subnets].sort((a, b) => a.netuid - b.netuid);
        
        return {
          title: 'Bittensor Subnets',
          contents: sortedSubnets.map(subnet => ({
            uri: `bittensor-neuron://${subnet.netuid}`,
            text: `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'} - ${subnet.totalValidators} validators, ${subnet.totalMiners} miners`
          }))
        };
      } catch (error) {
        logger.error('Error in bittensor_neurons resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving Bittensor neuron information: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  // Ressource pour les statistiques du réseau Bittensor
  server.resource(
    'bittensor_network',
    new ResourceTemplate('bittensor-network://{type}', {
      list: async () => {
        try {
          logger.info('Listing Bittensor network resources');
          
          return {
            resources: [
              {
                uri: 'bittensor-network://stats',
                name: 'Network Statistics',
                description: 'Global statistics for the Bittensor network'
              },
              {
                uri: 'bittensor-network://subnets',
                name: 'Subnets Overview',
                description: 'Overview of all subnets in the network'
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing Bittensor network resources:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Si un type est fourni, récupérer les informations spécifiques
        if (params.type === 'stats') {
          logger.info('Getting Bittensor network statistics');
          
          // Récupérer les statistiques du réseau
          const stats = await bittensorService.getNetworkStats();
          
          // Formater la réponse
          return {
            title: 'Bittensor Network Statistics',
            contents: [
              {
                uri: 'bittensor-network://stats/overview',
                text: `Network Overview: ${stats.totalSubnets} subnets, ${stats.totalNeurons} neurons, ${stats.totalStake.toFixed(2)} τ total stake`
              },
              {
                uri: 'bittensor-network://stats/composition',
                text: `Network Composition: ${stats.totalValidators} validators, ${stats.totalMiners} miners`
              },
              {
                uri: 'bittensor-network://stats/token',
                text: `TAO Token: $${stats.tao.price.toFixed(4)}, Market Cap: $${(stats.tao.marketCap / 1000000).toFixed(2)}M, Supply: ${(stats.tao.circulatingSupply / 1000000).toFixed(2)}M τ`
              },
              {
                uri: 'bittensor-network://stats/chain',
                text: `Blockchain: Block #${stats.blockNumber}, ~${stats.blockTime} sec block time, Last Updated: ${stats.lastUpdated}`
              }
            ]
          };
        }
        
        if (params.type === 'subnets') {
          logger.info('Getting Bittensor subnets overview');
          
          // Récupérer tous les subnets
          const subnets = await bittensorService.getSubnetInfo();
          
          if (!Array.isArray(subnets)) {
            return {
              contents: [],
              errorMessage: 'Failed to retrieve subnet list'
            };
          }
          
          // Trier les subnets par ID
          const sortedSubnets = [...subnets].sort((a, b) => a.netuid - b.netuid);
          
          // Obtenir les statistiques du réseau pour le titre
          const stats = await bittensorService.getNetworkStats();
          
          return {
            title: `Bittensor Network: ${sortedSubnets.length} Subnets`,
            contents: [
              {
                uri: 'bittensor-network://subnets/overview',
                text: `Network Overview: ${stats.totalNeurons} neurons, ${stats.totalStake.toFixed(2)} τ total stake`
              },
              ...sortedSubnets.map(subnet => ({
                uri: `bittensor-subnet://${subnet.netuid}`,
                text: `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'} - ${subnet.totalValidators} validators, ${subnet.totalMiners} miners, ${subnet.totalStake.toFixed(2)} τ stake`
              }))
            ]
          };
        }
        
        // Si aucun type n'est fourni, lister les ressources disponibles
        return {
          title: 'Bittensor Network Resources',
          contents: [
            {
              uri: 'bittensor-network://stats',
              text: 'Network Statistics: Global statistics for the Bittensor network'
            },
            {
              uri: 'bittensor-network://subnets',
              text: 'Subnets Overview: Overview of all subnets in the network'
            }
          ]
        };
      } catch (error) {
        logger.error('Error in bittensor_network resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving Bittensor network information: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  logger.info('Bittensor resources registered');
}