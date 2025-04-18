# Implementation Guide

## Architecture

The Masa Subnet 42 MCP Server implements a modular architecture connecting AI models to external data sources:

```
┌─────────────────┐     ┌───────────────┐     ┌───────────────────┐
│  MCP Client     │◄───►│  Transport    │◄───►│  MCP Server       │
│ (Claude, etc.)  │     │ (stdio, HTTP) │     │ (Masa Subnet 42)  │
└─────────────────┘     └───────────────┘     └───────┬───────────┘
                                                      │
                                                      ▼
                                             ┌───────────────────┐
                                             │  Service Layer    │
                                             │                   │
                                     ┌───────┴───────┬───────────┴──────┐
                                     │               │                  │
                                     ▼               ▼                  ▼
                             ┌───────────────┐ ┌─────────────┐  ┌───────────────┐
                             │  Masa API     │ │ Bittensor   │  │ Data Indexing │
                             │  Service      │ │ API Service │  │ Service       │
                             └───────────────┘ └──────┬──────┘  └───────────────┘
                                                      │
                                                      ▼
                                             ┌─────────────────┐
                                             │ TaoStats Cache  │
                                             │    Service      │
                                             └─────────────────┘
```

The architecture follows these principles:

1. **Modular Services**: Independent components that can be developed and tested separately
2. **Factory Pattern**: Services are created through factories for simpler configuration
3. **Lazy Loading**: Content is loaded on-demand to optimize API usage
4. **Intelligent Caching**: Persistent caching system for TaoStats API

## Core Components

### 1. MCP Server

The central component built on `@modelcontextprotocol/sdk`:

```typescript
export class MasaSubnetMcpServer {
  private server: McpServer;
  private transport: any;
  private registeredTools: string[] = [];
  private registeredResources: string[] = [];
  private currentMode: MasaMode;
  
  constructor() {
    this.currentMode = env.MASA_MODE;
    this.server = new McpServer({
      name: env.MCP_SERVER_NAME,
      version: env.MCP_SERVER_VERSION,
      description: env.MCP_SERVER_DESCRIPTION
    });
  }
  
  async initialize() {
    // Initialize services, tools, and resources
  }
  
  start(options?: { httpPort?: number, httpHost?: string }) {
    // Configure transport and start server
  }
}
```

### 2. TaoStats Cache Service

A key innovation for efficient API usage:

```typescript
export class TaoStatsCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private cachePath: string;
  private requestCounter: number = 0;
  private dailyRequestLimit: number = 5;
  private lastResetDay: number = new Date().getUTCDate();
  
  async withCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      fallbackToCache?: boolean;
      critical?: boolean;
      failSilently?: boolean;
    } = {}
  ): Promise<T> {
    // Intelligent caching logic
  }
  
  // Cache management methods
  private async initializeCache(): Promise<void> { /* ... */ }
  private async persistCache(): Promise<void> { /* ... */ }
  getCacheStats(): { /* ... */ } { /* ... */ }
  invalidate(key: string): void { /* ... */ }
  invalidateByPrefix(prefix: string): number { /* ... */ }
  clear(): void { /* ... */ }
}
```

### 3. Service Layer

#### Masa Service

Provides Twitter search and data indexing:

```typescript
interface MasaService {
  // Twitter endpoints
  searchTwitter(request: TwitterSearchRequest): Promise<TwitterSearchResult>;
  checkTwitterSearchStatus(jobId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    message?: string;
  }>;
  getTwitterSearchResults(jobId: string): Promise<TwitterSearchResult>;
  
  // Data indexing endpoints
  indexData(request: DataIndexRequest): Promise<DataIndexResult>;
  queryData(request: DataQueryRequest): Promise<DataQueryResult>;
  
  // Web scraping endpoints
  scrapeWeb(request: WebScrapeRequest): Promise<WebScrapeResult>;
  
  // Analysis endpoints
  extractSearchTerms(request: TermExtractionRequest): Promise<TermExtractionResult>;
  analyzeData(request: DataAnalysisRequest): Promise<DataAnalysisResult>;
  searchBySimilarity(request: SimilaritySearchRequest): Promise<SimilaritySearchResult>;
}
```

#### Bittensor Service

Provides cached access to Bittensor data:

```typescript
interface BittensorService {
  getSubnetInfo(netuid?: number): Promise<BittensorSubnetInfo | BittensorSubnetInfo[]>;
  getSubnetNodes(netuid: number, limit?: number, offset?: number): Promise<BittensorNodeInfo[]>;
  getValidatorInfo(hotkey: string): Promise<BittensorValidatorInfo>;
  getNeuronInfo(hotkey: string, netuid?: number): Promise<BittensorNeuronInfo>;
  getNetworkStats(): Promise<BittensorNetworkStats>;
}

// Extended service with cache statistics
interface BittensorCachedApiService extends BittensorService {
  getApiUsageStats(): {
    size: number;
    apiCallsUsed: number;
    apiCallsRemaining: number;
    lastResetDay: number;
  };
}
```

### 4. Transport Layer

The transport layer handles protocol communication:

```typescript
export class TransportFactory {
  static createTransport(options?: { 
    httpPort?: number,
    httpHost?: string
  }) {
    const transportType = process.env.MCP_TRANSPORT_TYPE || 'stdio';
    
    switch (transportType.toLowerCase()) {
      case 'http':
        return this.setupHttpTransport(options);
      case 'stdio':
      default:
        return new StdioServerTransport();
    }
  }
  
  static setupSSERoutes(mcpServer: any, httpTransport: any) {
    // Set up HTTP/SSE routes
  }
}
```

## Resources and Tools

### Resources Implementation

All resources follow a similar pattern:

```typescript
server.resource(
  'resource_name',
  new ResourceTemplate('protocol://{param1}/{param2}', {
    list: async () => {
      // Return static list of resources
      return { resources: [ ... ] };
    }
  }),
  async (uri, params) => {
    try {
      // Access and format data
      return {
        title: "Resource Title",
        contents: [
          {
            uri: uri.href,
            text: "Resource content..."
          }
        ]
      };
    } catch (error) {
      return {
        contents: [],
        errorMessage: `Error: ${error.message}`
      };
    }
  }
);
```

### Tools Implementation

Tools are implemented following this pattern:

```typescript
server.tool(
  'tool_name',
  {
    // Zod schema for parameters
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter')
  },
  async (params) => {
    try {
      // Tool implementation
      return {
        content: [{ 
          type: "text", 
          text: "Tool result..." 
        }]
      };
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: `Error: ${error.message}` 
        }],
        isError: true
      };
    }
  }
);
```

## Cache Strategy

Our caching approach offers significant benefits:

1. **Persistent Storage**
   - Cache is saved to `.cache/tao-cache.json`
   - Survives server restarts
   - Includes usage statistics

2. **Adaptive TTL**
   - Network stats: 15 minutes
   - Subnet information: 30 minutes
   - Validator/neuron data: 10-20 minutes

3. **Request Consolidation**
   - Identical concurrent requests are merged
   - Results are shared among all callers

4. **Fallback Mechanism**
   - When rate limits are reached, returns cached data even if expired
   - Gradually degrades service instead of failing

## Configuration

### Environment Variables

Key configuration options:

```
# MCP Server Configuration
MCP_SERVER_NAME=Masa Subnet 42 Data Provider
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_DESCRIPTION=Provides data access to Masa Subnet 42 resources
MCP_TRANSPORT_TYPE=stdio  # Options: stdio, http
MCP_HTTP_PORT=3030
MCP_HTTP_HOST=localhost

# Bittensor Configuration
TAO_STAT_API_KEY=your_taostat_api_key_here
TAO_STAT_DAILY_LIMIT=5  # Default API request limit per day
```

### Mode Selection

The server supports two operating modes:

1. **API Mode** (`MASA_MODE=API`)
   - Uses Masa API for Twitter search
   - Includes analysis tools
   - Requires `MASA_API_KEY`

2. **PROTOCOL Mode** (`MASA_MODE=PROTOCOL`)
   - Uses Masa Protocol for direct access
   - Includes advanced Twitter search
   - Includes advanced web scraping

## Performance Optimizations

### 1. Lazy Loading

Resources are only loaded when explicitly requested:

```typescript
async (uri, params) => {
  // Only load specific subnet when requested
  if (params.netuid) {
    // Cache key for this specific subnet
    const cacheKey = `subnet:info:${params.netuid}`;
    
    // Load with 30-minute TTL
    return taoStatsCache.withCache(
      cacheKey,
      async () => bittensorService.getSubnetInfo(params.netuid),
      { ttl: 30 * 60 * 1000 }
    );
  } else {
    // Return list of all subnets (different cache key and TTL)
  }
}
```

### 2. Request Deduplication

Concurrent identical requests are consolidated:

```typescript
// If there's already a pending request for this key, return it
const pendingRequest = this.pendingRequests.get(key);
if (pendingRequest && !forceRefresh) {
  logger.debug(`Using pending request for key: ${key}`);
  return pendingRequest;
}

// Otherwise, create a new request and store it
const fetchPromise = (async () => {
  // API request logic
})();

// Store the promise for deduplication
this.pendingRequests.set(key, fetchPromise);
```

### 3. API Limit Management

The system tracks and manages daily API limits:

```typescript
// Reset counter at midnight UTC
const currentDay = new Date().getUTCDate();
if (currentDay !== this.lastResetDay) {
  this.requestCounter = 0;
  this.lastResetDay = currentDay;
}

// Check if limit is reached
if (this.requestCounter >= this.dailyRequestLimit && !critical) {
  // Use expired cache data if available
  if (cachedEntry && fallbackToCache) {
    return cachedEntry.data;
  }
  
  // Otherwise, fail gracefully
  throw new Error(`TaoStats API daily limit reached`);
}
```

## Integration Example

### Claude Desktop Integration

1. Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "masa-subnet-mcp": {
      "command": "node",
      "args": [
        "/path/to/dist/index.js"
      ]
    }
  }
}
```

2. Restart Claude Desktop

3. Click the tool icon in the input field

4. Use tools like:
   - `bittensor_subnet_info`
   - `twitter_search`
   - `tao_stats_usage`

## Monitoring and Debugging

The server includes comprehensive monitoring:

1. **API Usage Tracking**
   ```typescript
   const stats = bittensorService.getApiUsageStats();
   console.log(`API calls: ${stats.apiCallsUsed}/${stats.apiCallsUsed + stats.apiCallsRemaining}`);
   ```

2. **Cache Statistics**
   ```typescript
   const stats = taoStatsCache.getCacheStats();
   console.log(`Cache entries: ${stats.size}`);
   ```

3. **Logging Configuration**
   ```typescript
   LOG_LEVEL=debug  // For detailed operation logs
   ```

4. **Usage Tool**
   - The `tao_stats_usage` tool provides comprehensive statistics
   - Shows calls used, remaining calls, cache size, and reset date