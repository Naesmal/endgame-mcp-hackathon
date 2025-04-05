import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { BittensorService } from '../services/bittensor-service';
import logger from '../utils/logger';

/**
 * Enregistre l'outil de recherche Bittensor dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param bittensorService Service Bittensor à utiliser
 */
export function registerBittensorSearchTool(
  server: McpServer,
  bittensorService: BittensorService
): void {
  // Outil de recherche Bittensor
  server.tool(
    'bittensor_search',
    {
      query: z.string().min(1, 'Query is required'),
      type: z.enum(['subnet', 'validator', 'neuron']).optional(),
      limit: z.number().optional()
    },
    async (params) => {
      try {
        const { query, type, limit } = params;
        const searchLimit = limit || 10;
        
        logger.info(`Executing Bittensor search: ${query}, type: ${type || 'any'}`);
        
        // Recherche générique si aucun type n'est spécifié
        if (!type) {
          // On essaie différentes stratégies de recherche

          // 1. Essayer de voir si la requête correspond à un ID de subnet (nombre)
          if (/^\d+$/.test(query)) {
            const netuid = parseInt(query);
            try {
              const subnet = await bittensorService.getSubnetInfo(netuid);
              if (!Array.isArray(subnet)) {
                return {
                  content: [{ 
                    type: "text", 
                    text: `Found Subnet ${netuid}: ${subnet.name || 'Unnamed'}\n\nOwner: ${subnet.owner || 'N/A'}\nDescription: ${subnet.description || 'N/A'}\nValidators: ${subnet.totalValidators}\nMiners: ${subnet.totalMiners}\nTotal Stake: ${subnet.totalStake} τ\n\nFull data:\n${JSON.stringify(subnet, null, 2)}` 
                  }]
                };
              }
            } catch (error) {
              logger.debug(`Query "${query}" is not a valid subnet ID: ${error}`);
              // Continuer avec d'autres stratégies de recherche
            }
          }

          // 2. Vérifier si la requête ressemble à une adresse hotkey
          if (query.length > 40 && query.startsWith('5')) {
            // La requête ressemble à une adresse hotkey (SS58)
            try {
              const validator = await bittensorService.getValidatorInfo(query);
              return {
                content: [{ 
                  type: "text", 
                  text: `Found validator with hotkey ${query.slice(0, 8)}...${query.slice(-8)}\n\nColdkey: ${validator.coldkey}\nStake: ${validator.stake} τ\nDelegated Stake: ${validator.delegatedStake} τ\nTotal Stake: ${validator.totalStake} τ\nActive in ${validator.subnets.length} subnet(s)\n\nFull data:\n${JSON.stringify(validator, null, 2)}` 
                }]
              };
            } catch (error) {
              logger.debug(`Not a validator hotkey, trying as neuron: ${error}`);
              
              try {
                // Essayer comme neurone sans spécifier de subnet
                const neuron = await bittensorService.getNeuronInfo(query);
                return {
                  content: [{ 
                    type: "text", 
                    text: `Found neuron with hotkey ${query.slice(0, 8)}...${query.slice(-8)}\n\nType: ${neuron.type}\nSubnet: ${neuron.netuid} ${neuron.subnetName ? `(${neuron.subnetName})` : ''}\nUID: ${neuron.uid}\nRank: ${neuron.rank.toFixed(4)}\nStake: ${neuron.stake.toFixed(2)} τ\n\nFull data:\n${JSON.stringify(neuron, null, 2)}` 
                  }]
                };
              } catch (neuronError) {
                logger.debug(`Not a neuron hotkey either: ${neuronError}`);
                // Continuer avec d'autres stratégies
              }
            }
          }

          // 3. Recherche par nom de subnet
          try {
            const allSubnets = await bittensorService.getSubnetInfo();
            if (Array.isArray(allSubnets)) {
              // Filtrer les subnets qui correspondent à la recherche (dans le nom ou la description)
              const matchingSubnets = allSubnets.filter(subnet => 
                (subnet.name && subnet.name.toLowerCase().includes(query.toLowerCase())) ||
                (subnet.description && subnet.description.toLowerCase().includes(query.toLowerCase()))
              );
              
              if (matchingSubnets.length > 0) {
                return {
                  content: [{ 
                    type: "text", 
                    text: `Found ${matchingSubnets.length} subnet(s) matching "${query}":\n\n${
                      matchingSubnets.map(subnet => 
                        `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'}\nDescription: ${subnet.description || 'N/A'}\nValidators: ${subnet.totalValidators}, Miners: ${subnet.totalMiners}, Stake: ${subnet.totalStake.toFixed(2)} τ`
                      ).join('\n\n')
                    }` 
                  }]
                };
              }
            }
          } catch (error) {
            logger.debug(`Error searching subnets by name: ${error}`);
          }

          // 4. Si aucune correspondance n'est trouvée, retourner un message d'erreur
          return {
            content: [{ 
              type: "text", 
              text: `No Bittensor data found for query: "${query}". Try specifying a search type (subnet, validator, neuron) or use more specific identifiers.` 
            }]
          };
        }

        // Recherche typée
        switch (type) {
          case 'subnet': {
            // Recherche de subnet
            try {
              // Essayer d'abord comme ID subnet
              if (/^\d+$/.test(query)) {
                const netuid = parseInt(query);
                const subnet = await bittensorService.getSubnetInfo(netuid);
                
                if (!Array.isArray(subnet)) {
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Found Subnet ${netuid}: ${subnet.name || 'Unnamed'}\n\nOwner: ${subnet.owner || 'N/A'}\nDescription: ${subnet.description || 'N/A'}\nValidators: ${subnet.totalValidators}\nMiners: ${subnet.totalMiners}\nTotal Stake: ${subnet.totalStake} τ\n\nFull data:\n${JSON.stringify(subnet, null, 2)}` 
                    }]
                  };
                }
              }
              
              // Sinon, rechercher par nom ou description
              const allSubnets = await bittensorService.getSubnetInfo();
              if (Array.isArray(allSubnets)) {
                const matchingSubnets = allSubnets.filter(subnet => 
                  (subnet.name && subnet.name.toLowerCase().includes(query.toLowerCase())) ||
                  (subnet.description && subnet.description.toLowerCase().includes(query.toLowerCase()))
                );
                
                if (matchingSubnets.length > 0) {
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Found ${matchingSubnets.length} subnet(s) matching "${query}":\n\n${
                        matchingSubnets.map(subnet => 
                          `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'}\nDescription: ${subnet.description || 'N/A'}\nValidators: ${subnet.totalValidators}, Miners: ${subnet.totalMiners}, Stake: ${subnet.totalStake.toFixed(2)} τ`
                        ).join('\n\n')
                      }` 
                    }]
                  };
                }
              }
              
              return {
                content: [{ 
                  type: "text", 
                  text: `No subnets found matching query: "${query}"` 
                }]
              };
            } catch (error) {
              logger.error('Error searching subnets:', error);
              return {
                content: [{ 
                  type: "text", 
                  text: `Error searching subnets: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }],
                isError: true
              };
            }
          }
          
          case 'validator': {
            // Recherche de validateur
            try {
              if (query.length > 40 && query.startsWith('5')) {
                // La requête ressemble à une adresse hotkey (SS58)
                try {
                  const validator = await bittensorService.getValidatorInfo(query);
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Found validator with hotkey ${query.slice(0, 8)}...${query.slice(-8)}\n\nColdkey: ${validator.coldkey}\nStake: ${validator.stake} τ\nDelegated Stake: ${validator.delegatedStake} τ\nTotal Stake: ${validator.totalStake} τ\nActive in ${validator.subnets.length} subnet(s)\n\nFull data:\n${JSON.stringify(validator, null, 2)}` 
                    }]
                  };
                } catch (error) {
                  logger.debug(`Not a validator hotkey: ${error}`);
                  return {
                    content: [{ 
                      type: "text", 
                      text: `No validator found with hotkey "${query}"` 
                    }]
                  };
                }
              } else {
                return {
                  content: [{ 
                    type: "text", 
                    text: `Invalid validator search query: "${query}". Please provide a valid hotkey address.` 
                  }]
                };
              }
            } catch (error) {
              logger.error('Error searching validators:', error);
              return {
                content: [{ 
                  type: "text", 
                  text: `Error searching validators: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }],
                isError: true
              };
            }
          }
          
          case 'neuron': {
            // Recherche de neurone
            try {
              // Vérifier d'abord si la requête est au format "netuid/hotkey"
              const parts = query.split('/');
              if (parts.length === 2 && /^\d+$/.test(parts[0]) && parts[1].length > 40 && parts[1].startsWith('5')) {
                const netuid = parseInt(parts[0]);
                const hotkey = parts[1];
                
                try {
                  const neuron = await bittensorService.getNeuronInfo(hotkey, netuid);
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Found neuron with hotkey ${hotkey.slice(0, 8)}...${hotkey.slice(-8)} in subnet ${netuid}\n\nType: ${neuron.type}\nUID: ${neuron.uid}\nRank: ${neuron.rank.toFixed(4)}\nStake: ${neuron.stake.toFixed(2)} τ\n\nFull data:\n${JSON.stringify(neuron, null, 2)}` 
                    }]
                  };
                } catch (error) {
                  return {
                    content: [{ 
                      type: "text", 
                      text: `No neuron found with hotkey "${hotkey}" in subnet ${netuid}` 
                    }]
                  };
                }
              } else if (query.length > 40 && query.startsWith('5')) {
                // Juste une hotkey, chercher sans subnet spécifique
                try {
                  const neuron = await bittensorService.getNeuronInfo(query);
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Found neuron with hotkey ${query.slice(0, 8)}...${query.slice(-8)}\n\nType: ${neuron.type}\nSubnet: ${neuron.netuid} ${neuron.subnetName ? `(${neuron.subnetName})` : ''}\nUID: ${neuron.uid}\nRank: ${neuron.rank.toFixed(4)}\nStake: ${neuron.stake.toFixed(2)} τ\n\nFull data:\n${JSON.stringify(neuron, null, 2)}` 
                    }]
                  };
                } catch (error) {
                  return {
                    content: [{ 
                      type: "text", 
                      text: `No neuron found with hotkey "${query}"` 
                    }]
                  };
                }
              } else {
                return {
                  content: [{ 
                    type: "text", 
                    text: `Invalid neuron search query: "${query}". Please provide a valid hotkey address or format "netuid/hotkey".` 
                  }]
                };
              }
            } catch (error) {
              logger.error('Error searching neurons:', error);
              return {
                content: [{ 
                  type: "text", 
                  text: `Error searching neurons: ${error instanceof Error ? error.message : 'Unknown error'}` 
                }],
                isError: true
              };
            }
          }
          
          default:
            return {
              content: [{ 
                type: "text", 
                text: `Invalid search type: ${type}. Supported types are: subnet, validator, neuron.` 
              }],
              isError: true
            };
        }
      } catch (error) {
        logger.error('Error in bittensor_search tool:', error);
        return {
          content: [{ 
            type: "text", 
            text: `Error performing Bittensor search: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }],
          isError: true
        };
      }
    }
  );
  
  logger.info('Bittensor search tool registered');
}