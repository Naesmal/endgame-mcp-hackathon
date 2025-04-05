import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { BittensorService } from './bittensor-service';
import {
  BittensorSubnetInfo,
  BittensorNodeInfo,
  BittensorValidatorInfo,
  BittensorNeuronInfo,
  BittensorNetworkStats
} from '../types';
import logger from '../utils/logger';
import { generateId } from '../utils/helpers';

/**
 * Implémentation du service Bittensor utilisant l'API TaoStats
 */
export class BittensorApiService implements BittensorService {
  private client: AxiosInstance;
  
  constructor() {
    // Créer un client axios avec la configuration de base
    this.client = axios.create({
      baseURL: 'https://api.taostats.io/api',
      headers: {
        'Authorization': `${env.TAO_STAT_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 secondes
    });
    
    // Ajouter un intercepteur pour les logs
    this.client.interceptors.request.use(request => {
      logger.debug(`TaoStats API Request: ${request.method?.toUpperCase()} ${request.url}`);
      return request;
    });
    
    this.client.interceptors.response.use(
      response => {
        logger.debug(`TaoStats API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      error => {
        if (error.response) {
          logger.error(`TaoStats API Error: ${error.response.status} ${error.response.statusText}`);
          // Ne pas logguer les détails complets de l'erreur, juste un résumé
          logger.debug(`TaoStats API Error Message: ${error.message}`);
        } else {
          logger.error(`TaoStats API Request Failed: ${error.message}`);
        }
        // Important: retourner une erreur propre pour être correctement traitée par MCP
        return Promise.reject(new Error(`Request failed: ${error.message}`));
      }
    );
  }
  
  /**
   * Récupère les informations d'un sous-réseau Bittensor
   * @param netuid ID du sous-réseau (optionnel, si non fourni, retourne tous les sous-réseaux)
   * @returns Informations du sous-réseau
   */
  async getSubnetInfo(netuid?: number): Promise<BittensorSubnetInfo | BittensorSubnetInfo[]> {
    try {
      // Si un netuid est fourni, récupérer les informations spécifiques
      if (netuid !== undefined) {
        const response = await this.client.get(`/subnet/latest/v1?netuid=${netuid}`);
        
        if (response.data && response.data.data && response.data.data.length > 0) {
          const subnet = response.data.data[0];
          return this.mapSubnetData(subnet);
        }
        
        throw new Error(`Subnet with netuid ${netuid} not found`);
      }
      
      // Sinon, récupérer tous les sous-réseaux
      const response = await this.client.get('/subnet/latest/v1');
      
      if (response.data && response.data.data) {
        return response.data.data.map((subnet: any) => this.mapSubnetData(subnet));
      }
      
      return [];
    } catch (error) {
      logger.error('Error fetching subnet info:', error);
      throw error;
    }
  }
  
  /**
   * Récupère les informations des nœuds d'un sous-réseau Bittensor
   * @param netuid ID du sous-réseau
   * @param limit Nombre maximal de nœuds à retourner (optionnel, défaut: 100)
   * @param offset Décalage pour la pagination (optionnel, défaut: 0)
   * @returns Liste des nœuds
   */
  async getSubnetNodes(netuid: number, limit: number = 100, offset: number = 0): Promise<BittensorNodeInfo[]> {
    try {
      // Utiliser l'endpoint pour obtenir les informations des nœuds alpha du sous-réseau
      const response = await this.client.get(`/dtao/hotkey_alpha_shares/latest/v1?netuid=${netuid}&limit=${limit}`);
      
      if (response.data && response.data.data) {
        return response.data.data.map((node: any) => this.mapNodeData(node, netuid));
      }
      
      return [];
    } catch (error) {
      logger.error(`Error fetching subnet nodes for netuid ${netuid}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les informations d'un validateur Bittensor
   * @param hotkey Adresse du hotkey du validateur
   * @returns Informations du validateur
   */
  async getValidatorInfo(hotkey: string): Promise<BittensorValidatorInfo> {
    try {
      // Récupérer les informations du validateur par son hotkey
      const response = await this.client.get(`/validator/latest/v1?hotkey=${hotkey}`);
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const validator = response.data.data[0];
        return this.mapValidatorData(validator);
      }
      
      throw new Error(`Validator with hotkey ${hotkey} not found`);
    } catch (error) {
      logger.error(`Error fetching validator info for hotkey ${hotkey}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les informations d'un neurone Bittensor
   * @param hotkey Adresse du hotkey du neurone
   * @param netuid ID du sous-réseau (optionnel)
   * @returns Informations du neurone
   */
  async getNeuronInfo(hotkey: string, netuid?: number): Promise<BittensorNeuronInfo> {
    try {
      // Construire l'URL en fonction des paramètres
      let url = `/dtao/hotkey_emission/v1?hotkey=${hotkey}`;
      if (netuid !== undefined) {
        url += `&netuid=${netuid}`;
      }
      
      const response = await this.client.get(url);
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const neuron = response.data.data[0];
        return this.mapNeuronData(neuron);
      }
      
      throw new Error(`Neuron with hotkey ${hotkey}${netuid !== undefined ? ` in subnet ${netuid}` : ''} not found`);
    } catch (error) {
      logger.error(`Error fetching neuron info for hotkey ${hotkey}:`, error);
      throw error;
    }
  }
  
  /**
   * Récupère les statistiques globales du réseau Bittensor
   * @returns Statistiques du réseau
   */
  async getNetworkStats(): Promise<BittensorNetworkStats> {
    try {
      // Récupérer les statistiques globales du réseau
      const statsResponse = await this.client.get('/stats/latest/v1');
      const blockResponse = await this.client.get('/block/v1?limit=1');
      const priceResponse = await this.client.get('/price/history/v1?asset=tao&limit=1');
      
      let totalStake = 0;
      let totalSubnets = 0;
      let totalValidators = 0;
      let totalMiners = 0;
      let totalNeurons = 0;
      
      // Extraction des statistiques de base
      if (statsResponse.data && statsResponse.data.data && statsResponse.data.data.length > 0) {
        const stats = statsResponse.data.data[0];
        if (stats.subnets) totalSubnets = stats.subnets;
        if (stats.total_stake) totalStake = parseFloat(stats.total_stake) / 1e9;
        if (stats.total_validators) totalValidators = stats.total_validators;
        if (stats.total_miners) totalMiners = stats.total_miners;
        if (stats.total_neurons) totalNeurons = stats.total_validators + stats.total_miners;
      }
      
      // Extraction du numéro de bloc
      let blockNumber = 0;
      let blockTime = 0;
      if (blockResponse.data && blockResponse.data.data && blockResponse.data.data.length > 0) {
        blockNumber = blockResponse.data.data[0].block_number;
        // Supposons que le temps de bloc est d'environ 12 secondes (moyenne)
        blockTime = 12;
      }
      
      // Extraction du prix
      let price = 0;
      let circulatingSupply = 0;
      let totalSupply = 0;
      let volume24h = 0;
      let marketCap = 0;
      
      if (priceResponse.data && priceResponse.data.data && priceResponse.data.data.length > 0) {
        const priceData = priceResponse.data.data[0];
        price = parseFloat(priceData.price);
        
        // Pour les autres métriques, on utiliserait normalement des endpoints spécifiques
        // Ici, nous estimons des valeurs raisonnables basées sur les données disponibles
        if (statsResponse.data && statsResponse.data.data && statsResponse.data.data.length > 0) {
          const stats = statsResponse.data.data[0];
          if (stats.issued) {
            circulatingSupply = parseFloat(stats.issued) / 1e9;
            totalSupply = circulatingSupply * 1.1; // Estimation
            marketCap = circulatingSupply * price;
            volume24h = marketCap * 0.05; // Estimation: 5% du market cap
          }
        }
      }
      
      // Construction de la réponse
      return {
        totalStake,
        totalSubnets,
        totalNeurons,
        totalValidators,
        totalMiners,
        tao: {
          price,
          marketCap,
          volume24h,
          circulatingSupply,
          totalSupply
        },
        blockNumber,
        blockTime,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error fetching network stats:', error);
      throw error;
    }
  }
  
  /**
   * Convertit les données de subnet de l'API en format BittensorSubnetInfo
   * @param subnet Données subnet de l'API
   * @returns Format BittensorSubnetInfo
   */
  private mapSubnetData(subnet: any): BittensorSubnetInfo {
    return {
      netuid: subnet.netuid,
      name: subnet.name || `Subnet ${subnet.netuid}`,
      description: subnet.description || '',
      owner: subnet.owner?.ss58 || '',
      totalStake: parseFloat(subnet.total_stake || '0') / 1e9,
      totalValidators: subnet.active_keys || 0,
      totalMiners: subnet.max_neurons - (subnet.active_keys || 0),
      totalSupply: parseFloat(subnet.emission || '0') / 1e9,
      emissionRate: parseFloat(subnet.emission_rate || '0') / 1e9,
      blocksSinceLast: parseInt(subnet.blocks_since_last || '0'),
      lastUpdated: subnet.timestamp || new Date().toISOString()
    };
  }
  
  /**
   * Convertit les données de node de l'API en format BittensorNodeInfo
   * @param node Données node de l'API
   * @param netuid ID du sous-réseau
   * @returns Format BittensorNodeInfo
   */
  private mapNodeData(node: any, netuid: number): BittensorNodeInfo {
    return {
      uid: node.uid || 0,
      hotkey: node.hotkey?.ss58 || '',
      coldkey: node.coldkey?.ss58 || '',
      stake: parseFloat(node.stake || '0') / 1e9,
      rank: parseFloat(node.rank || '0'),
      emission: parseFloat(node.emission || '0') / 1e9,
      incentive: parseFloat(node.incentive || '0'),
      consensus: parseFloat(node.consensus || '0'),
      trust: parseFloat(node.trust || '0'),
      dividends: parseFloat(node.dividends || '0'),
      lastUpdate: node.timestamp || new Date().toISOString(),
      ip: node.ip || '',
      port: node.port || 0,
      version: node.version || '',
      type: node.validator ? 'validator' : 'miner'
    };
  }
  
  /**
   * Convertit les données de validateur de l'API en format BittensorValidatorInfo
   * @param validator Données validateur de l'API
   * @returns Format BittensorValidatorInfo
   */
  private mapValidatorData(validator: any): BittensorValidatorInfo {
    return {
      hotkey: validator.hotkey?.ss58 || '',
      coldkey: validator.coldkey?.ss58 || '',
      stake: parseFloat(validator.stake || '0') / 1e9,
      delegatedStake: parseFloat(validator.delegated_stake || '0') / 1e9,
      totalStake: parseFloat(validator.total_stake || '0') / 1e9,
      subnets: (validator.subnets || []).map((subnet: any) => ({
        netuid: subnet.netuid,
        rank: parseFloat(subnet.rank || '0'),
        emission: parseFloat(subnet.emission || '0') / 1e9
      })),
      delegations: (validator.delegations || []).map((delegation: any) => ({
        hotkey: delegation.hotkey?.ss58 || '',
        amount: parseFloat(delegation.amount || '0') / 1e9
      })),
      lastUpdate: validator.timestamp || new Date().toISOString()
    };
  }
  
  /**
   * Convertit les données de neurone de l'API en format BittensorNeuronInfo
   * @param neuron Données neurone de l'API
   * @returns Format BittensorNeuronInfo
   */
  private mapNeuronData(neuron: any): BittensorNeuronInfo {
    return {
      hotkey: neuron.hotkey?.ss58 || '',
      coldkey: neuron.coldkey?.ss58 || '',
      uid: neuron.uid || 0,
      netuid: neuron.netuid,
      stake: parseFloat(neuron.stake || '0') / 1e9,
      rank: parseFloat(neuron.rank || '0'),
      emission: parseFloat(neuron.emission || '0') / 1e9,
      incentive: parseFloat(neuron.incentive || '0'),
      consensus: parseFloat(neuron.consensus || '0'),
      trust: parseFloat(neuron.trust || '0'),
      dividends: parseFloat(neuron.dividends || '0'),
      lastUpdate: neuron.timestamp || new Date().toISOString(),
      ip: neuron.ip || '',
      port: neuron.port || 0,
      version: neuron.version || '',
      type: neuron.validator ? 'validator' : 'miner',
      subnetName: neuron.subnet_name || ''
    };
  }
}