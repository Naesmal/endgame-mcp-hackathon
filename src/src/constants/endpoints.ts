// Endpoints pour l'API Masa
export const API_ENDPOINTS = {
  // Endpoints pour la recherche Twitter
  TWITTER: {
    SEARCH: '/search/live/twitter',
    STATUS: '/search/live/twitter/status',
    RESULT: '/search/live/twitter/result',
  },
  
  // Endpoints pour l'indexation de données
  DATA: {
    INDEX: '/data/index',
    QUERY: '/data/query',
    STATUS: '/data/status',
  }
};

// Endpoints pour le protocole Masa
export const PROTOCOL_ENDPOINTS = {
  // Endpoints pour la recherche Twitter
  TWITTER: {
    SEARCH: '/api/v1/data/twitter/tweets/recent',
    ADVANCED_SEARCH: '/api/v1/data/twitter/tweets/search',
  },
  
  // Endpoints pour l'indexation de données
  DATA: {
    INDEX: '/api/v1/data/index',
    QUERY: '/api/v1/data/query',
  }
};

// Endpoints pour l'API TaoStats (Bittensor)
export const TAOSTATS_ENDPOINTS = {
  // Endpoints pour les informations des sous-réseaux
  SUBNET: {
    LATEST: '/subnet/latest/v1',
    HISTORY: '/subnet/history/v1'
  },
  
  // Endpoints pour les validateurs
  VALIDATOR: {
    LATEST: '/validator/latest/v1'
  },
  
  // Endpoints pour les émissions
  EMISSION: {
    HOTKEY: '/dtao/hotkey_emission/v1',
    SUBNET: '/dtao/subnet_emission/v1'
  },
  
  // Endpoints pour les parts alpha (stakes)
  ALPHA: {
    SHARES: '/dtao/hotkey_alpha_shares/latest/v1',
    BALANCE: '/dtao/stake_balance/latest/v1',
    HISTORY: '/dtao/stake_balance/history/v1'
  },
  
  // Endpoints pour les statistiques du réseau
  STATS: {
    LATEST: '/stats/latest/v1'
  },
  
  // Endpoints pour les informations de bloc
  BLOCK: {
    LATEST: '/block/v1'
  },
  
  // Endpoints pour les prix
  PRICE: {
    HISTORY: '/price/history/v1',
    OHLC: '/price/ohlc/v1'
  }
};