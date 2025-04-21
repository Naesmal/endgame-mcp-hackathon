<p align="center">
  <img src="https://animated-botany-8d4.notion.site/image/attachment%3A019cc489-1e46-4232-a725-c4d4717cd7c3%3Amcp_42.jpg?table=block&id=1bc20952-12fb-80b1-a3c0-dc822b342dda" alt="Masa Subnet 42 MCP Challenge" width="200" />
</p>

# Masa Subnet 42 MCP Server

## Overview

The Masa Subnet 42 MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) to connect Large Language Models (LLMs) with Bittensor network data and Masa Subnet 42's capabilities. This server enables AI assistants to retrieve real-time blockchain data, search Twitter, and perform data indexing with intelligent rate limiting and caching.

## Features

- **Bittensor Network Integration** - Access subnet, validator, and neuron data with efficient caching
- **Twitter Search Capabilities** - Basic and advanced tweet search functionality
- **Data Indexing and Querying** - Store and retrieve arbitrary data with natural language queries
- **Smart Rate Limiting** - Optimized API usage with persistent caching to avoid rate limits
- **Multiple Transport Options** - Support for both stdio and HTTP/SSE transports

## Installation

### Prerequisites

- Node.js v22.14.0 (22+)
- npm v10.9.2 (10+)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Naesmal/endgame-mcp-hackathon
cd endgame-mcp-hackathon
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following configuration:
```
# Mode Configuration
MASA_MODE=API  # Options: API or PROTOCOL

# API Configuration
MASA_API_KEY=your_api_key_here
MASA_API_BASE_URL=https://data.dev.masalabs.ai

# Protocol Configuration
MASA_PROTOCOL_NODE_URL=http://localhost:8080

# MCP Server Configuration
MCP_SERVER_NAME=Masa Subnet 42 Data Provider
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_DESCRIPTION=Provides data access to Masa Subnet 42 resources
MCP_TRANSPORT_TYPE=stdio  # Options: stdio, http
MCP_HTTP_PORT=3030
MCP_HTTP_HOST=localhost

# Log Configuration
LOG_LEVEL=info  # Options: debug, info, warn, error

# Bittensor Configuration
TAO_STAT_API_KEY=your_taostat_api_key_here
TAO_STAT_DAILY_LIMIT=5  # Default API request limit per day
```

4. Build the project:
```bash
npm run build
```

## 🔑 Masa API and Protocol Setup

### Obtaining Masa API Key
To get a Masa API key for this project, visit:
- [Masa API Documentation](https://developers.masa.ai/docs/index-API/masa-api-search)

### Setting Up Masa Protocol
For instructions on setting up the Masa Protocol environment, refer to:
- [Masa Protocol Environment Setup Guide](https://developers.masa.ai/docs/masa-protocol/environment-setup)

## Usage

### Running as a standalone server

Start the MCP server:
```bash
npm start
```

### Integrating with Claude Desktop

1. Open Claude Desktop and go to Settings > Developer > Edit Config
2. Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "masa-subnet-mcp": {
      "command": "node",
      "args": [
        "path/to/dist/index.js"
      ]
    }
  }
}
```
3. Restart Claude Desktop
4. Click the tools icon in the input box to see available tools

## Available Tools

### Twitter Tools
- `twitter_search` - Search for tweets by keyword (API & PROTOCOL)
- `twitter_advanced_search` - Advanced tweet search with filters (PROTOCOL only)

### Data Indexing Tools
- `data_info` - Get information about the data indexing system
- `index_data` - Store data for future retrieval
- `query_data` - Search previously indexed data

### Web Scraping Tools
- `web_scrape` - Extract content from web pages (API & PROTOCOL)
- `web_scrape_advanced` - Advanced web scraping with depth control (PROTOCOL only)

### Data Analysis Tools (API mode only)
- `extract_search_terms` - Extract search terms from user input
- `analyze_tweets` - Analyze tweet content with custom prompts
- `similarity_search` - Search indexed data using semantic similarity

### Bittensor Tools (requires TAO_STAT_API_KEY)
- `bittensor_subnet_info` - Get subnet information
- `bittensor_subnet_nodes` - List validator and miner nodes in a subnet
- `bittensor_validator_info` - Get validator details
- `bittensor_neuron_info` - Get neuron details
- `bittensor_network_stats` - Get Bittensor network statistics
- `bittensor_search` - Search for entities in the Bittensor network
- `subnet_info` - Get information about Masa Subnet 42
- `tao_stats_usage` - Monitor TaoStats API usage and cache statistics

## Available Resources

### Twitter Resources
- `twitter-search://{searchId}` - Access Twitter search results

### Web Resources
- `web://{url}` - Access web page content

### Bittensor Resources (requires TAO_STAT_API_KEY)
- `bittensor-subnet://{netuid}` - Access subnet data
- `bittensor-neuron://{subnet}/{hotkey}` - Access neuron information
- `bittensor-network://{type}` - Access network statistics
- `data://bittensor/{category}/{query}` - Structured Bittensor data access

## Rate Limiting and Caching

This server includes intelligent rate limiting and caching for TaoStats API:

- **Persistent Cache** - API responses are cached on disk to preserve data between server restarts
- **Daily Limit Management** - Tracks API usage against configurable daily limits
- **Intelligent Fallback** - Uses expired cache data when API limits are reached
- **Request Deduplication** - Consolidates identical concurrent requests
- **Usage Monitoring** - The `tao_stats_usage` tool provides real-time statistics on API usage

Configure the daily API limit with the `TAO_STAT_DAILY_LIMIT` environment variable (default: 5).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) for creating the standard
- [Anthropic](https://www.anthropic.com/) for Claude and the Claude Desktop application
- [Bittensor](https://bittensor.com/) for the decentralized machine learning network
- [Masa Subnet 42](https://masa.ai/) for their data infrastructure
- [TaoStats](https://taostats.io/) for Bittensor network data

---

<p align="center">Made with ❤️ for the Masa Subnet 42 Challenge</p>