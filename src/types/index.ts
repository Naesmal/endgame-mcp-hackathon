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
  data?: Array<TwitterData>;
  error?: string;
  workerPeerId?: string;
  pending?: boolean; // Nouvel attribut pour indiquer si la recherche est toujours en cours
}

export interface TwitterData {
  Tweet?: {
    ID: string;
    ExternalID?: string;
    Text: string;
    Username: string;
    CreatedAt: string;
    LikeCount?: number;
    RetweetCount?: number;
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

// Type pour la requête de scraping web
export interface WebScrapeRequest {
  url: string;
  format?: 'text' | 'html' | 'json';
  depth?: number;
}

// Type pour le résultat de scraping web
export interface WebScrapeResult {
  id?: string;
  title?: string;
  content: string;
  url: string;
  metadata?: Record<string, any>;
  error?: string;
}

// Type pour la requête d'extraction de termes
export interface TermExtractionRequest {
  userInput: string;
  count?: number;
}

// Type pour le résultat d'extraction de termes
export interface TermExtractionResult {
  searchTerms: string[];
  thinking?: string;
  error?: string;
}

// Type pour la requête d'analyse de données
export interface DataAnalysisRequest {
  tweets: string | string[];
  prompt: string;
}

// Type pour le résultat d'analyse de données
export interface DataAnalysisResult {
  result: string;
  error?: string;
}

// Type pour la requête de recherche par similarité
export interface SimilaritySearchRequest {
  query: string;
  keywords?: string[];
  maxResults?: number;
  namespace?: string;
}

// Type pour le résultat de recherche par similarité
export interface SimilaritySearchResult {
  results: Array<{
    id: string;
    text: string;
    similarity: number;
    [key: string]: any;
  }>;
  total: number;
  error?: string;
}