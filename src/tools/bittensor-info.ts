import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BittensorService } from '../services/bittensor-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil d'information Bittensor dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param bittensorService Service Bittensor à utiliser
 */
export function registerBittensorInfoTool(
  server: McpServer,
  bittensorService: BittensorService
): void {
  // Outil d'information sur les sous-réseaux Bittensor
  server.tool(
    'bittensor_subnet_info', 
    {
      netuid: z.number().optional().describe('ID du sous-réseau Bittensor (optionnel)'),
    },
    async (params) => {
      try {
        const { netuid } = params;
        
        logger.info(`Getting Bittensor subnet info${netuid !== undefined ? ` for netuid ${netuid}` : ''}`);
        
        // Récupérer les informations du sous-réseau
        const result = await bittensorService.getSubnetInfo(netuid);
        
        // Formater la réponse
        if (Array.isArray(result)) {
          // Résultats multiples
          return {
            content: [{ 
              type: "text", 
              text: `Found ${result.length} Bittensor subnets\n\n${JSON.stringify(result, null, 2)}` 
            }]
          };
        } else {
          // Résultat unique
          return {
            content: [{ 
              type: "text", 
              text: `Bittensor Subnet ${result.netuid} Information\n\nName: ${result.name || 'N/A'}\nDescription: ${result.description || 'N/A'}\nOwner: ${result.owner || 'N/A'}\nTotal Stake: ${result.totalStake} τ\nValidators: ${result.totalValidators}\nMiners: ${result.totalMiners}\nLast Updated: ${result.lastUpdated}\n\nRaw Data:\n${JSON.stringify(result, null, 2)}` 
            }]
          };
        }
      } catch (error) {
        logger.error('Error in bittensor_subnet_info tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving Bittensor subnet info: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil d'information sur les nœuds d'un sous-réseau Bittensor
  server.tool(
    'bittensor_subnet_nodes', 
    {
      netuid: z.number().describe('ID du sous-réseau Bittensor'),
      limit: z.number().min(1).max(200).optional().default(20).describe('Nombre maximum de nœuds à retourner'),
      offset: z.number().min(0).optional().default(0).describe('Décalage pour la pagination'),
    },
    async (params) => {
      try {
        const { netuid, limit, offset } = params;
        
        logger.info(`Getting Bittensor subnet nodes for netuid ${netuid} (limit: ${limit}, offset: ${offset})`);
        
        // Récupérer les nœuds du sous-réseau
        const nodes = await bittensorService.getSubnetNodes(netuid, limit, offset);
        
        // Formater la réponse
        if (nodes.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `No nodes found for Bittensor subnet ${netuid}` 
            }]
          };
        }
        
        const summary = `Found ${nodes.length} nodes in Bittensor subnet ${netuid}`;
        const validators = nodes.filter(node => node.type === 'validator');
        const miners = nodes.filter(node => node.type === 'miner');
        const validatorSummary = `Validators: ${validators.length}`;
        const minerSummary = `Miners: ${miners.length}`;
        
        // Formatter des tableaux résumés pour les nœuds
        const validatorTable = validators.length > 0 ? 
          `\n\nTop Validators:\nRank  | Hotkey            | Stake (τ)    | Emission\n${'-'.repeat(60)}\n${
            validators.slice(0, 10).map(v => 
              `${v.rank.toFixed(2).padStart(5)} | ${v.hotkey.slice(0, 16).padEnd(16)} | ${v.stake.toFixed(2).padStart(12)} | ${v.emission.toFixed(6)}`
            ).join('\n')
          }` : '';
        
        const minerTable = miners.length > 0 ? 
          `\n\nTop Miners:\nRank  | Hotkey            | Stake (τ)    | Emission\n${'-'.repeat(60)}\n${
            miners.slice(0, 10).map(m => 
              `${m.rank.toFixed(2).padStart(5)} | ${m.hotkey.slice(0, 16).padEnd(16)} | ${m.stake.toFixed(2).padStart(12)} | ${m.emission.toFixed(6)}`
            ).join('\n')
          }` : '';
        
        return {
          content: [{ 
            type: "text", 
            text: `${summary}\n${validatorSummary}\n${minerSummary}${validatorTable}${minerTable}\n\nFull data available in raw format.` 
          }]
        };
      } catch (error) {
        logger.error('Error in bittensor_subnet_nodes tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving Bittensor subnet nodes: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil d'information sur un validateur Bittensor
  server.tool(
    'bittensor_validator_info', 
    {
      hotkey: z.string().min(1).describe('Adresse du hotkey du validateur'),
    },
    async (params) => {
      try {
        const { hotkey } = params;
        
        logger.info(`Getting Bittensor validator info for hotkey ${hotkey}`);
        
        // Récupérer les informations du validateur
        const validator = await bittensorService.getValidatorInfo(hotkey);
        
        // Formater la réponse
        const subnetsInfo = validator.subnets.length > 0 ?
          `\n\nSubnets:\n${validator.subnets.map(s => 
            `- Subnet ${s.netuid}: Rank ${s.rank.toFixed(4)}, Emission ${s.emission.toFixed(6)} τ`
          ).join('\n')}` : '\n\nNo subnets registered';
        
        const delegationsInfo = validator.delegations.length > 0 ?
          `\n\nDelegations:\n${validator.delegations.map(d => 
            `- From ${d.hotkey.slice(0, 16)}: ${d.amount.toFixed(2)} τ`
          ).join('\n')}` : '\n\nNo delegations';
        
        return {
          content: [{ 
            type: "text", 
            text: `Bittensor Validator Information\n\nHotkey: ${validator.hotkey}\nColdkey: ${validator.coldkey}\nOwn Stake: ${validator.stake.toFixed(2)} τ\nDelegated Stake: ${validator.delegatedStake.toFixed(2)} τ\nTotal Stake: ${validator.totalStake.toFixed(2)} τ\nLast Updated: ${validator.lastUpdate}${subnetsInfo}${delegationsInfo}` 
          }]
        };
      } catch (error) {
        logger.error('Error in bittensor_validator_info tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving Bittensor validator info: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil d'information sur un neurone Bittensor
  server.tool(
    'bittensor_neuron_info', 
    {
      hotkey: z.string().min(1).describe('Adresse du hotkey du neurone'),
      netuid: z.number().optional().describe('ID du sous-réseau (optionnel)'),
    },
    async (params) => {
      try {
        const { hotkey, netuid } = params;
        
        logger.info(`Getting Bittensor neuron info for hotkey ${hotkey}${netuid !== undefined ? ` in subnet ${netuid}` : ''}`);
        
        // Récupérer les informations du neurone
        const neuron = await bittensorService.getNeuronInfo(hotkey, netuid);
        
        // Formater la réponse
        return {
          content: [{ 
            type: "text", 
            text: `Bittensor Neuron Information\n\nHotkey: ${neuron.hotkey}\nColdkey: ${neuron.coldkey}\nType: ${neuron.type}\nSubnet: ${neuron.netuid} ${neuron.subnetName ? `(${neuron.subnetName})` : ''}\nUID: ${neuron.uid}\nStake: ${neuron.stake.toFixed(2)} τ\nRank: ${neuron.rank.toFixed(4)}\nEmission: ${neuron.emission.toFixed(6)} τ\nTrust: ${neuron.trust.toFixed(4)}\nConsensus: ${neuron.consensus.toFixed(4)}\nLast Updated: ${neuron.lastUpdate}\n\nFull Data:\n${JSON.stringify(neuron, null, 2)}` 
          }]
        };
      } catch (error) {
        logger.error('Error in bittensor_neuron_info tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving Bittensor neuron info: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  // Outil de statistiques du réseau Bittensor
  server.tool(
    'bittensor_network_stats', 
    {},
    async () => {
      try {
        logger.info('Getting Bittensor network statistics');
        
        // Récupérer les statistiques du réseau
        const stats = await bittensorService.getNetworkStats();
        
        // Formater la réponse
        const taoInfo = stats.tao ? 
          `\n\nTAO Token Information:
Price: $${stats.tao.price.toFixed(4)}
Market Cap: $${(stats.tao.marketCap / 1000000).toFixed(2)}M
24h Volume: $${(stats.tao.volume24h / 1000000).toFixed(2)}M
Circulating Supply: ${(stats.tao.circulatingSupply / 1000000).toFixed(2)}M τ
Total Supply: ${(stats.tao.totalSupply / 1000000).toFixed(2)}M τ` : '';
        
        return {
          content: [{ 
            type: "text", 
            text: `Bittensor Network Statistics\n\nTotal Subnets: ${stats.totalSubnets}\nTotal Neurons: ${stats.totalNeurons}\n- Validators: ${stats.totalValidators}\n- Miners: ${stats.totalMiners}\nTotal Stake: ${stats.totalStake.toFixed(2)} τ\nCurrent Block: ${stats.blockNumber}\nBlock Time: ~${stats.blockTime} seconds\nLast Updated: ${stats.lastUpdated}${taoInfo}` 
          }]
        };
      } catch (error) {
        logger.error('Error in bittensor_network_stats tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error retrieving Bittensor network stats: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  server.tool(
    'subnet_info',
    {},
    async () => {
      try {
        logger.info('subnet_info tool called (with Bittensor data)');
        
        // Récupérer les statistiques du réseau Bittensor
        const stats = await bittensorService.getNetworkStats();
        
        // Formater la réponse
        const taoInfo = stats.tao ? 
          `\nTAO Token: $${stats.tao.price.toFixed(4)}, Market Cap: $${(stats.tao.marketCap / 1000000).toFixed(2)}M` : '';
        
        return {
          content: [{ 
            type: "text", 
            text: `Subnet: Masa Subnet 42 (Bittensor Gateway)
Status: active
Nodes: ${stats.totalValidators}/${stats.totalNeurons}
Subnets: ${stats.totalSubnets}
Last Update: ${stats.lastUpdated}${taoInfo}

Note: This subnet provides access to the Bittensor network. Use bittensor_* tools for more detailed information.` 
          }]
        };
      } catch (error) {
        logger.error('Error in subnet_info tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error getting subnet info: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Bittensor info tools registered');
}

