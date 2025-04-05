import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BittensorService } from '../services/bittensor-service';
import logger from '../utils/logger';

/**
 * Enregistre la ressource de données Bittensor dans le serveur MCP
 * @param server Instance du serveur MCP
 * @param bittensorService Service Bittensor à utiliser
 */
export function registerBittensorDataResource(
  server: McpServer,
  bittensorService: BittensorService
): void {
  // Ressource pour les données indexées Bittensor
  server.resource(
    'bittensor_data',
    new ResourceTemplate('data://bittensor/{category?}/{query?}', {
      list: async () => {
        try {
          logger.info('Listing Bittensor data categories');
          
          // Retourner les catégories disponibles pour Bittensor
          return {
            resources: [
              {
                uri: 'data://bittensor/subnets',
                name: 'Subnets',
                description: 'Bittensor subnet data'
              },
              {
                uri: 'data://bittensor/validators',
                name: 'Validators',
                description: 'Bittensor validator data'
              },
              {
                uri: 'data://bittensor/neurons',
                name: 'Neurons',
                description: 'Bittensor neuron data'
              },
              {
                uri: 'data://bittensor/stats',
                name: 'Network Stats',
                description: 'Bittensor network statistics'
              }
            ]
          };
        } catch (error) {
          logger.error('Error listing Bittensor data categories:', error);
          throw error;
        }
      }
    }),
    async (uri, params) => {
      try {
        // Traiter les catégories de données Bittensor
        const category = params.category ? 
          (Array.isArray(params.category) ? params.category[0] : params.category) : null;
        
        const query = params.query ? 
          (Array.isArray(params.query) ? params.query[0] : params.query) : null;
        
        // Si aucune catégorie n'est fournie, retourner la liste des catégories
        if (!category) {
          logger.info('Listing Bittensor data categories');
          
          return {
            title: 'Bittensor Data Categories',
            contents: [
              {
                uri: 'data://bittensor/subnets',
                text: 'Subnets - Information about Bittensor subnets'
              },
              {
                uri: 'data://bittensor/validators',
                text: 'Validators - Information about Bittensor validators'
              },
              {
                uri: 'data://bittensor/neurons',
                text: 'Neurons - Information about Bittensor neurons'
              },
              {
                uri: 'data://bittensor/stats',
                text: 'Network Stats - Bittensor network statistics'
              }
            ]
          };
        }
        
        // Traiter chaque catégorie
        switch (category.toLowerCase()) {
          case 'subnets': {
            // Si un ID de subnet (query) est fourni
            if (query && /^\d+$/.test(query)) {
              const netuid = parseInt(query);
              logger.info(`Getting Bittensor subnet data for netuid ${netuid}`);
              
              try {
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
                    uri: `data://bittensor/subnets/${netuid}/info`,
                    text: `General Info: ${subnet.name || 'Unnamed'}, Owner: ${subnet.owner || 'N/A'}`
                  },
                  {
                    uri: `data://bittensor/subnets/${netuid}/stats`,
                    text: `Stats: ${subnet.totalValidators} validators, ${subnet.totalMiners} miners, ${subnet.totalStake.toFixed(2)} τ stake`
                  }
                ];
                
                // Ajouter les nœuds principaux
                nodes.forEach((node, index) => {
                  contents.push({
                    uri: `data://bittensor/neurons/${netuid}/${node.hotkey}`,
                    text: `${index + 1}. ${node.type === 'validator' ? 'Validator' : 'Miner'}: ${node.hotkey.slice(0, 16)}... - Rank: ${node.rank.toFixed(4)}`
                  });
                });
                
                return {
                  title: `Subnet ${netuid} (${subnet.name || 'Unnamed'})`,
                  contents
                };
              } catch (error) {
                logger.error(`Error getting subnet ${netuid}:`, error);
                return {
                  contents: [],
                  errorMessage: `Error retrieving subnet ${netuid}: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
              }
            }
            
            // Si aucun ID n'est fourni, lister tous les subnets
            logger.info('Listing all Bittensor subnets');
            
            try {
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
                  uri: `data://bittensor/subnets/${subnet.netuid}`,
                  text: `Subnet ${subnet.netuid}: ${subnet.name || 'Unnamed'} - ${subnet.totalValidators} validators, ${subnet.totalMiners} miners`
                }))
              };
            } catch (error) {
              logger.error('Error listing subnets:', error);
              return {
                contents: [],
                errorMessage: `Error retrieving subnet list: ${error instanceof Error ? error.message : 'Unknown error'}`
              };
            }
          }
          
          case 'validators': {
            // Si un hotkey (query) est fourni
            if (query && query.length > 40 && query.startsWith('5')) {
              logger.info(`Getting Bittensor validator data for hotkey ${query}`);
              
              try {
                const validator = await bittensorService.getValidatorInfo(query);
                
                const contents = [
                  {
                    uri: `data://bittensor/validators/${query}/info`,
                    text: `General Info: Stake: ${validator.stake.toFixed(2)} τ, Delegated: ${validator.delegatedStake.toFixed(2)} τ, Total: ${validator.totalStake.toFixed(2)} τ`
                  }
                ];
                
                // Ajouter les subnets
                validator.subnets.forEach((subnet, index) => {
                  contents.push({
                    uri: `data://bittensor/subnets/${subnet.netuid}`,
                    text: `Subnet ${subnet.netuid}: Rank ${subnet.rank.toFixed(4)}, Emission ${subnet.emission.toFixed(6)} τ`
                  });
                });
                
                // Ajouter les délégations
                if (validator.delegations.length > 0) {
                  contents.push({
                    uri: `data://bittensor/validators/${query}/delegations`,
                    text: `Delegations: ${validator.delegations.length} delegators, ${validator.delegatedStake.toFixed(2)} τ total`
                  });
                }
                
                return {
                  title: `Validator ${query.slice(0, 8)}...${query.slice(-8)}`,
                  contents
                };
              } catch (error) {
                logger.error(`Error getting validator ${query}:`, error);
                return {
                  contents: [],
                  errorMessage: `Error retrieving validator ${query}: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
              }
            }
            
            // Si aucun hotkey n'est fourni ou si c'est un autre type de requête
            // Ici on pourrait implémenter une recherche plus avancée ou des suggestions
            return {
              title: 'Bittensor Validators',
              contents: [
                {
                  uri: 'data://bittensor/validators/info',
                  text: 'To access validator data, please provide a valid hotkey in the format: data://bittensor/validators/{hotkey}'
                }
              ]
            };
          }
          
          case 'neurons': {
            // Si on a un format netuid/hotkey
            const parts = query ? query.split('/') : [];
            
            if (parts.length === 2 && /^\d+$/.test(parts[0]) && parts[1].length > 40 && parts[1].startsWith('5')) {
              const netuid = parseInt(parts[0]);
              const hotkey = parts[1];
              
              logger.info(`Getting Bittensor neuron data for hotkey ${hotkey} in subnet ${netuid}`);
              
              try {
                const neuron = await bittensorService.getNeuronInfo(hotkey, netuid);
                
                return {
                  title: `Neuron ${hotkey.slice(0, 8)}...${hotkey.slice(-8)} in Subnet ${netuid}`,
                  contents: [
                    {
                      uri: `data://bittensor/neurons/${netuid}/${hotkey}/info`,
                      text: `General Info: ${neuron.type}, UID: ${neuron.uid}, Rank: ${neuron.rank.toFixed(4)}`
                    },
                    {
                      uri: `data://bittensor/neurons/${netuid}/${hotkey}/stake`,
                      text: `Stake: ${neuron.stake.toFixed(2)} τ, Emission: ${neuron.emission.toFixed(6)} τ`
                    },
                    {
                      uri: `data://bittensor/neurons/${netuid}/${hotkey}/metrics`,
                      text: `Metrics: Trust ${neuron.trust.toFixed(4)}, Consensus ${neuron.consensus.toFixed(4)}, Incentive ${neuron.incentive.toFixed(4)}`
                    }
                  ]
                };
              } catch (error) {
                logger.error(`Error getting neuron ${hotkey} in subnet ${netuid}:`, error);
                return {
                  contents: [],
                  errorMessage: `Error retrieving neuron ${hotkey} in subnet ${netuid}: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
              }
            }
            // Si juste un netuid est fourni
            else if (query && /^\d+$/.test(query)) {
              const netuid = parseInt(query);
              
              logger.info(`Getting Bittensor neurons for subnet ${netuid}`);
              
              try {
                // Récupérer les nœuds du subnet
                const nodes = await bittensorService.getSubnetNodes(netuid, 20);
                
                if (nodes.length === 0) {
                  return {
                    contents: [],
                    errorMessage: `No neurons found for subnet ${netuid}`
                  };
                }
                
                // Trier les nœuds par rang
                const sortedNodes = [...nodes].sort((a, b) => b.rank - a.rank);
                
                return {
                  title: `Neurons in Subnet ${netuid}`,
                  contents: sortedNodes.map(node => ({
                    uri: `data://bittensor/neurons/${netuid}/${node.hotkey}`,
                    text: `${node.type === 'validator' ? 'Validator' : 'Miner'}: ${node.hotkey.slice(0, 16)}... - Rank: ${node.rank.toFixed(4)}, Stake: ${node.stake.toFixed(2)} τ`
                  }))
                };
              } catch (error) {
                logger.error(`Error listing neurons for subnet ${netuid}:`, error);
                return {
                  contents: [],
                  errorMessage: `Error retrieving neurons for subnet ${netuid}: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
              }
            }
            // Si juste un hotkey est fourni
            else if (query && query.length > 40 && query.startsWith('5')) {
              const hotkey = query;
              
              logger.info(`Getting Bittensor neuron data for hotkey ${hotkey}`);
              
              try {
                const neuron = await bittensorService.getNeuronInfo(hotkey);
                
                return {
                  title: `Neuron ${hotkey.slice(0, 8)}...${hotkey.slice(-8)}`,
                  contents: [
                    {
                      uri: `data://bittensor/neurons/${neuron.netuid}/${hotkey}/info`,
                      text: `General Info: ${neuron.type}, Subnet ${neuron.netuid} ${neuron.subnetName ? `(${neuron.subnetName})` : ''}, UID: ${neuron.uid}`
                    },
                    {
                      uri: `data://bittensor/neurons/${neuron.netuid}/${hotkey}/stake`,
                      text: `Stake: ${neuron.stake.toFixed(2)} τ, Emission: ${neuron.emission.toFixed(6)} τ`
                    },
                    {
                      uri: `data://bittensor/neurons/${neuron.netuid}/${hotkey}/metrics`,
                      text: `Metrics: Rank ${neuron.rank.toFixed(4)}, Trust ${neuron.trust.toFixed(4)}, Consensus ${neuron.consensus.toFixed(4)}`
                    }
                  ]
                };
              } catch (error) {
                logger.error(`Error getting neuron ${hotkey}:`, error);
                return {
                  contents: [],
                  errorMessage: `Error retrieving neuron ${hotkey}: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
              }
            }
            
            // Si aucun paramètre valide n'est fourni
            return {
              title: 'Bittensor Neurons',
              contents: [
                {
                  uri: 'data://bittensor/neurons/info',
                  text: 'To access neuron data, please use one of these formats:\n- data://bittensor/neurons/{netuid} (list neurons in a subnet)\n- data://bittensor/neurons/{hotkey} (get info on a specific neuron)\n- data://bittensor/neurons/{netuid}/{hotkey} (get info on a neuron in a specific subnet)'
                }
              ]
            };
          }
          
          case 'stats': {
            logger.info('Getting Bittensor network statistics');
            
            try {
              const stats = await bittensorService.getNetworkStats();
              
              return {
                title: 'Bittensor Network Statistics',
                contents: [
                  {
                    uri: 'data://bittensor/stats/overview',
                    text: `Network Overview: ${stats.totalSubnets} subnets, ${stats.totalNeurons} neurons (${stats.totalValidators} validators, ${stats.totalMiners} miners)`
                  },
                  {
                    uri: 'data://bittensor/stats/stake',
                    text: `Stake: ${stats.totalStake.toFixed(2)} τ total stake across the network`
                  },
                  {
                    uri: 'data://bittensor/stats/token',
                    text: `TAO Token: $${stats.tao.price.toFixed(4)}, Market Cap: $${(stats.tao.marketCap / 1000000).toFixed(2)}M, Supply: ${(stats.tao.circulatingSupply / 1000000).toFixed(2)}M τ`
                  },
                  {
                    uri: 'data://bittensor/stats/blockchain',
                    text: `Blockchain: Block #${stats.blockNumber}, ~${stats.blockTime} sec block time, Last Updated: ${stats.lastUpdated}`
                  }
                ]
              };
            } catch (error) {
              logger.error('Error getting network stats:', error);
              return {
                contents: [],
                errorMessage: `Error retrieving network statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
              };
            }
          }
          
          default: {
            // Si autre catégorie ou non reconnue
            logger.info(`Unrecognized Bittensor data category: ${category}`);
            
            return {
              title: 'Bittensor Data Categories',
              contents: [
                {
                  uri: 'data://bittensor/subnets',
                  text: 'Subnets - Information about Bittensor subnets'
                },
                {
                  uri: 'data://bittensor/validators',
                  text: 'Validators - Information about Bittensor validators'
                },
                {
                  uri: 'data://bittensor/neurons',
                  text: 'Neurons - Information about Bittensor neurons'
                },
                {
                  uri: 'data://bittensor/stats',
                  text: 'Network Stats - Bittensor network statistics'
                }
              ],
              errorMessage: `Unrecognized category: ${category}. Please use one of the available categories.`
            };
          }
        }
      } catch (error) {
        logger.error('Error in bittensor_data resource:', error);
        return {
          contents: [],
          errorMessage: `Error retrieving Bittensor data: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  );
  
  logger.info('Bittensor data resource registered successfully');
  logger.info(`Registered resource with URI template: data://bittensor/{category?}/{query?}`);
}