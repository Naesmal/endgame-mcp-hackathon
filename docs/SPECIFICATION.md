# Model Context Protocol Specification

## Protocol Overview

The Masa Subnet 42 MCP server implements the Model Context Protocol (MCP), connecting AI models to external data sources with a focus on:

1. **Bittensor network data access** with intelligent caching and rate limiting
2. **Twitter search and data indexing capabilities** for enhanced AI context

Our implementation follows the standard MCP architecture:
- **Host Applications**: LLM platforms like Claude Desktop that initiate connections
- **Clients**: Connection managers within host applications
- **Servers**: Our implementation providing resources and tools

## Core Components

### 1. Resource System

Resources provide read-only data access through standardized URIs:

- **Twitter Resources**
  - `twitter-search://{searchId}` - Access cached search results

- **Web Resources**
  - `web://{url}` - Access scraped web content

- **Bittensor Resources**
  - `bittensor-subnet://{netuid}` - Subnet information
  - `bittensor-neuron://{subnet}/{hotkey}` - Neuron details
  - `bittensor-network://{type}` - Network-level statistics
  - `data://bittensor/{category}/{query}` - Structured data access

### 2. Tool System

Tools enable models to execute actions:

- **Twitter Tools**
  - `twitter_search` - Basic tweet search
  - `twitter_advanced_search` - Advanced filtering (PROTOCOL mode only)

- **Data Tools**
  - `data_info`, `index_data`, `query_data` - Data indexing and retrieval
  - `web_scrape`, `web_scrape_advanced` - Web content extraction

- **Analysis Tools** (API mode only)
  - `extract_search_terms`, `analyze_tweets`, `similarity_search`

- **Bittensor Tools**
  - `bittensor_subnet_info`, `bittensor_subnet_nodes`, etc. - Network data access
  - `tao_stats_usage` - Monitor API usage and cache statistics

### 3. Transport Layer

Our implementation supports multiple transport mechanisms:

- **Standard Input/Output (stdio)**: Default for local CLI and desktop integration
- **HTTP with Server-Sent Events (SSE)**: For web-based implementations

### 4. Cache and Rate Limiting System

To handle API rate limits efficiently:

- **Persistent Cache**: Saves responses to disk between server restarts
- **Request Deduplication**: Consolidates identical concurrent requests
- **TTL Management**: Different cache durations based on data type
- **Fallback Mechanism**: Uses expired cache when limits are reached
- **Monitoring**: Provides real-time API usage statistics

## Data Flow

1. **Initialization**:
   - Client connects to server
   - Server advertises resources and tools
   - Protocol capabilities are negotiated

2. **Resource Access**:
   - Client requests specific resource content
   - Server checks cache for existing data
   - If cache miss or expired, server makes API request (respecting rate limits)
   - Server returns formatted content

3. **Tool Execution**:
   - Client sends tool call with arguments
   - Server executes functionality (using cache when appropriate)
   - Server returns results or appropriate error

4. **Cache Management**:
   - Cache entries are stored with timestamps and expiration
   - Daily API usage is tracked and reset at midnight UTC
   - Cache is persisted to disk regularly and on shutdown

## Error Handling

The implementation includes robust error handling:

- **API Failures**: Graceful fallback to cached data
- **Rate Limit Protection**: Prevents 429 errors by tracking limits
- **Clear Error Messages**: Helpful diagnostics for troubleshooting
- **Fallback Behaviors**: Degraded but functional operation when services are unavailable

## Security Considerations

Important security aspects of our implementation:

- **API Key Protection**: Keys are never exposed in responses
- **Input Validation**: All tool inputs are validated with Zod schemas
- **Rate Limiting**: Prevents service abuse and account lockouts
- **Error Sanitization**: Errors are sanitized before being returned
- **Host Binding**: SSE transport binds only to localhost by default

## Integration Guidelines

### For Client Developers

1. **Connection Setup**:
   - Connect using stdio (default) or HTTP/SSE
   - Initialize with protocol version negotiation

2. **Resource Discovery and Access**:
   - List available resources with `resources/list`
   - Read resources with `resources/read`

3. **Tool Usage**:
   - List tools with `tools/list`
   - Call tools with `tools/call`
   - Handle returned content appropriately

### For Service Developers

1. **Service Implementation**:
   - Implement the `MasaService` or `BittensorService` interfaces
   - Use `tao-cache-service.ts` for TaoStats API caching

2. **Resource and Tool Registration**:
   - Register with the corresponding method on the MCP server
   - Implement handlers with appropriate caching

3. **Error Management**:
   - Implement try/catch blocks in all handlers
   - Return proper error objects when needed
   - Use the cache fallback mechanism for resilience