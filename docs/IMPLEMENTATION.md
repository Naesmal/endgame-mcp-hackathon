# Implementation Guide

## Architecture

The Masa Subnet 42 MCP Plugin is built on a modular architecture designed to provide seamless integration between AI models and external data sources. The implementation follows these key architectural principles:

1. **Modular Service Design**: Core functionality is divided into independent services that can be developed, tested, and scaled separately.

2. **Protocol-First Approach**: All components implement the Model Context Protocol specifications, ensuring standardized communication.

3. **Pluggable Transport Layer**: The system supports multiple transport mechanisms (stdio, HTTP/SSE) via a common interface.

4. **Factory Pattern**: Service implementations are created through factories to simplify configuration and testing.

5. **Lazy Loading**: Resources are defined statically but content is loaded on-demand to optimize performance.

The overall architecture can be visualized as:

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
                             └───────────────┘ └─────────────┘  └───────────────┘
```

## Components

The implementation consists of these core components:

### 1. MCP Server

The central component that implements the Model Context Protocol server, built on `@modelcontextprotocol/sdk`. It:
- Handles protocol lifecycle (initialization, message exchange, termination)
- Registers resources and tools
- Manages capabilities and configuration

```typescript
export class MasaSubnetMcpServer {
  private server: McpServer;
  private transport: any;
  
  constructor() {
    this.server = new McpServer({
      name: env.MCP_SERVER_NAME,
      version: env.MCP_SERVER_VERSION,
      description: env.MCP_SERVER_DESCRIPTION
    });
  }
  
  async initialize() {
    // Initialize services, tools, and resources
  }
  
  start() {
    // Configure and start the transport
  }
}
```

### 2. Service Layer

The service layer abstracts external API interactions:

#### Masa Service

Provides Twitter search and data indexing capabilities:
- `searchTwitter()`: Execute Twitter searches
- `getTwitterSearchResults()`: Retrieve search results
- `indexData()`: Store data for future retrieval
- `queryData()`: Query previously indexed data

#### Bittensor Service

Provides Bittensor network data access:
- `getSubnetInfo()`: Retrieve subnet information
- `getSubnetNodes()`: List nodes in a subnet
- `getValidatorInfo()`: Get validator details
- `getNeuronInfo()`: Get neuron details
- `getNetworkStats()`: Retrieve network statistics

### 3. Resources

Resources provide data access via URI templates:

#### Twitter Resources
- `twitter-search://{searchId}`: Access stored search results

#### Bittensor Resources
- `bittensor-subnet://{netuid}`: Access subnet information
- `bittensor-neuron://{subnet}/{hotkey}`: Access neuron information
- `bittensor-network://{type}`: Access network-level information
- `data://bittensor/{category}/{query}`: Structured data access

### 4. Tools

Tools provide functional capabilities:

#### Twitter Tools
- `twitter_search`: Search Twitter
- `twitter_advanced_search`: Advanced Twitter search

#### Data Indexing Tools
- `index_data`: Store data for future retrieval
- `query_data`: Query indexed data

#### Bittensor Tools
- `bittensor_subnet_info`: Get subnet information
- `bittensor_subnet_nodes`: List subnet nodes
- `bittensor_validator_info`: Get validator information
- `bittensor_neuron_info`: Get neuron information
- `bittensor_network_stats`: Get network statistics
- `bittensor_search`: Search entities in the network

### 5. Transport Layer

The transport layer handles the communication protocol:
- `StdioServerTransport`: For CLI and desktop application integration
- `SSEServerTransport`: For web-based integration

## Setup

Setting up the Masa Subnet 42 MCP Plugin involves these steps:

### 1. Environment Preparation

Ensure you have:
- Node.js v18 or higher
- npm v7 or higher

### 2. Installation

Clone and set up the repository:

```bash
git clone https://github.com/Naesmal/endgame-mcp-hackathon.git
cd endgame-mcp-hackathon
npm install
```

### 3. Configuration

Create a `.env` file with required settings:

```
# Masa Configuration
MASA_MODE=PROTOCOL
MASA_API_KEY=your_masa_api_key
MASA_API_BASE_URL=https://api.masasubnet.com/v1
MASA_PROTOCOL_NODE_URL=https://protocol.masasubnet.com/v1

# Bittensor Configuration (optional, but recommended)
TAO_STAT_API_KEY=your_tao_stat_api_key

# MCP Server Configuration
MCP_SERVER_NAME=Masa Subnet 42 Data Provider
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_DESCRIPTION=Provides data access to Masa Subnet 42 resources
MCP_TRANSPORT_TYPE=stdio
```

### 4. Building

Build the TypeScript code:

```bash
npm run build
```

### 5. Publishing (Optional)

For npm package publishing:

```bash
npm publish
```

## Usage

### Standalone Usage

Run the server directly:

```bash
npm start
```

### Claude Desktop Integration

1. Open Claude Desktop
2. Navigate to Settings > Developer > Edit Config
3. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "masa-subnet": {
      "command": "node",
      "args": [
        "path/dist/index.js"
      ]
    }
  }
}
```

4. Restart Claude Desktop
5. When conversing with Claude, use the hammer icon to access tools

### Developer Integration

For developers integrating with the plugin:

```typescript
import { MasaSubnetMcpServer } from 'masa-mcp-plugin';

const server = new MasaSubnetMcpServer();
await server.initialize();
server.start({ httpPort: 3000 }); // Optional HTTP configuration
```

## Performance

The implementation includes several performance optimizations:

### 1. Static Resource Lists

Resource lists are pre-defined statically to avoid excessive API calls:

```typescript
list: async () => {
  // Return static list instead of API calls
  const resources = [];
  
  // Add static subnet entries
  for (let i = 0; i <= 30; i++) {
    resources.push({
      uri: `bittensor-subnet://${i}`,
      name: `Subnet ${i}`,
      description: `Bittensor subnet with ID ${i}`
    });
  }
  
  return { resources };
}
```

### 2. Lazy Loading

Detailed data is loaded only when explicitly requested:

```typescript
async (uri, params) => {
  // Only load subnet data when a specific netuid is requested
  if (params.netuid) {
    const subnet = await bittensorService.getSubnetInfo(params.netuid);
    // Process and return subnet data
  } else {
    // Return a list of available subnets (lighter operation)
  }
}
```

### 3. Error Recovery

Robust error handling prevents cascading failures:

```typescript
try {
  const result = await apiCall();
  return formatResult(result);
} catch (error) {
  logger.error('API Error:', error);
  // Return meaningful error without failing the whole request
  return {
    content: [{ 
      type: "text", 
      text: `Error: ${error.message}` 
    }],
    isError: true
  };
}
```

### 4. Performance Metrics

In our testing, the implementation achieves:

- **Resource Listing**: <100ms for static resources
- **Twitter Search**: 1-2 seconds depending on query complexity
- **Bittensor Data Retrieval**: 200-500ms for subnet information
- **Concurrent Connections**: Supports 10+ simultaneous clients (HTTP mode)

## Testing

Our testing approach includes:

### 1. Unit Testing

Individual components are tested in isolation:
- Service mock objects
- Resource and tool handler tests
- Transport layer tests

Example unit test:

```typescript
describe('BittensorService', () => {
  let service: BittensorService;
  let mockApiClient: jest.Mocked<AxiosInstance>;
  
  beforeEach(() => {
    mockApiClient = createMockAxiosInstance();
    service = new BittensorApiService(mockApiClient);
  });
  
  test('getSubnetInfo returns formatted subnet data', async () => {
    // Arrange
    mockApiClient.get.mockResolvedValue({
      data: { /* mock API response */ }
    });
    
    // Act
    const result = await service.getSubnetInfo(1);
    
    // Assert
    expect(result).toHaveProperty('netuid', 1);
    expect(result).toHaveProperty('totalValidators');
    expect(mockApiClient.get).toHaveBeenCalledWith('/subnet/latest/v1?netuid=1');
  });
});
```

### 2. Integration Testing

End-to-end tests that validate:
- Server initialization
- Resource and tool registration
- Request handling

Example integration test:

```typescript
describe('MCP Server Integration', () => {
  let server: MasaSubnetMcpServer;
  let client: McpClient;
  
  beforeEach(async () => {
    // Set up server with mock services
    server = new MasaSubnetMcpServer();
    await server.initialize();
    server.start();
    
    // Connect client
    client = new McpClient();
    await client.connect();
  });
  
  test('client can list resources', async () => {
    // Act
    const resources = await client.listResources();
    
    // Assert
    expect(resources).toContainEqual(
      expect.objectContaining({
        uri: 'twitter-search://info'
      })
    );
  });
});
```

### 3. Performance Testing

Metrics for:
- Resource listing speed
- Tool call latency
- Concurrent connection handling

### 4. Manual Testing

Claude Desktop integration testing:
- Tool discoverability
- Resource access
- Error handling
- User experience

Our tests show consistent performance across different environments, with robust error handling and graceful degradation when external services are unavailable.