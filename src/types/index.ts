// Types pour le service Masa

// Type pour la requête de recherche Twitter
export interface TwitterSearchRequest {
  query: string;
  count?: number;
  fromDate?: string;
  toDate?: string;
  maxResults?: number;
}

// Type pour le résultat de recherche Twitter
export interface TwitterSearchResult {
  id: string;
  data?: TwitterData[];
  workerPeerId?: string;
  error?: string;
}

// Type pour les données Twitter
export interface TwitterData {
  Tweet?: {
    ID: string;
    ConversationID: string;
    Text: string;
    HTML: string;
    Hashtags?: string[];
    CreatedAt: string;
    Username: string;
    LikeCount?: number;
    RetweetCount?: number;
    ReplyCount?: number;
    [key: string]: any;
  };
  Error?: string;
}

// Type pour les requêtes d'indexation de données
export interface DataIndexRequest {
  data: any;
  metadata?: Record<string, any>;
  namespace?: string;
}

// Type pour les résultats d'indexation de données
export interface DataIndexResult {
  id: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
}

// Type pour les requêtes de recherche de données
export interface DataQueryRequest {
  query: string;
  namespace?: string;
  limit?: number;
  offset?: number;
}

// Type pour les résultats de recherche de données
export interface DataQueryResult {
  data: any[];
  total: number;
  hasMore: boolean;
}

// Type pour les informations du subnet
export interface SubnetInfo {
  name: string;
  version: string;
  activeNodes: number;
  totalNodes: number;
  status: 'active' | 'inactive' | 'degraded';
  lastUpdate: string;
}

// Type pour les informations d'un nœud
export interface NodeInfo {
  id: string;
  ip: string;
  status: 'active' | 'inactive';
  uptime: number;
  stake: number;
  lastSeen: string;
}

// Types pour Bittensor

// Type pour les informations de sous-réseau Bittensor
export interface BittensorSubnetInfo {
  netuid: number;
  name?: string;
  description?: string;
  owner?: string;
  totalStake: number;
  totalValidators: number;
  totalMiners: number;
  totalSupply: number;
  emissionRate: number;
  blocksSinceLast: number;
  lastUpdated: string;
}

// Type pour les informations d'un nœud Bittensor
export interface BittensorNodeInfo {
  uid: number;
  hotkey: string;
  coldkey: string;
  stake: number;
  rank: number;
  emission: number;
  incentive: number;
  consensus: number;
  trust: number;
  dividends: number;
  lastUpdate: string;
  ip?: string;
  port?: number;
  version?: string;
  type: 'validator' | 'miner';
}

// Type pour les informations du validateur Bittensor
export interface BittensorValidatorInfo {
  hotkey: string;
  coldkey: string;
  stake: number;
  delegatedStake: number;
  totalStake: number;
  subnets: Array<{
    netuid: number;
    rank: number;
    emission: number;
  }>;
  delegations: Array<{
    hotkey: string;
    amount: number;
  }>;
  lastUpdate: string;
}

// Type pour les informations neuronales Bittensor
export interface BittensorNeuronInfo {
  hotkey: string;
  coldkey: string;
  uid: number;
  netuid: number;
  stake: number;
  rank: number;
  emission: number;
  incentive: number;
  consensus: number;
  trust: number;
  dividends: number;
  lastUpdate: string;
  ip?: string;
  port?: number;
  version?: string;
  type: 'validator' | 'miner';
  subnetName?: string;
}

// Type pour les statistiques du réseau Bittensor
export interface BittensorNetworkStats {
  totalStake: number;
  totalSubnets: number;
  totalNeurons: number;
  totalValidators: number;
  totalMiners: number;
  tao: {
    price: number;
    marketCap: number;
    volume24h: number;
    circulatingSupply: number;
    totalSupply: number;
  };
  blockNumber: number;
  blockTime: number;
  lastUpdated: string;
}