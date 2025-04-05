<p align="center">
  <img src="https://animated-botany-8d4.notion.site/image/attachment%3A019cc489-1e46-4232-a725-c4d4717cd7c3%3Amcp_42.jpg?table=block&id=1bc20952-12fb-80b1-a3c0-dc822b342dda" alt="Masa Subnet 42 MCP Challenge" width="200" />
</p>

## 🌟 Overview

The Masa Subnet 42 MCP Plugin is an implementation of the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) that connects Large Language Models (LLMs) to the Bittensor network and Masa Subnet 42. This plugin enables AI assistants to retrieve real-time data from the Bittensor network, search Twitter, and index data for future retrieval.

This MCP server provides both **resources** (for loading information into the LLM's context) and **tools** (for executing code and producing side effects) that expand the capabilities of AI assistants.

## 🚀 Features

- **Bittensor Network Integration**
  - Access subnet information
  - View neuron and validator data
  - Get real-time network statistics

- **Twitter Search Capabilities**
  - Search for tweets with advanced filtering
  - Retrieve historical Twitter search results

- **Data Indexing and Querying**
  - Index arbitrary data for future retrieval
  - Query indexed data with natural language

## 🛠️ Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (v7 or higher)

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

3. Create a `.env` file in the project root:

```
# Mode Configuration (API or PROTOCOL)
MASA_MODE=API  # Options: API or PROTOCOL

# API Configuration
MASA_API_KEY=your_api_key_here
MASA_API_BASE_URL=https://api1.dev.masalabs.ai

# Protocol Configuration
MASA_PROTOCOL_NODE_URL=http://localhost:8080

# MCP Server Configuration
MCP_SERVER_NAME=Masa Subnet 42 Data Provider
MCP_SERVER_VERSION=1.0.0
MCP_SERVER_DESCRIPTION=Provides data access to Masa Subnet 42 resources
MCP_TRANSPORT_TYPE=stdio  # Options: stdio, http
MCP_HTTP_PORT=3030  # Port for HTTP transport
MCP_HTTP_HOST=localhost  # Host for HTTP transport

# Log Configuration
LOG_LEVEL=info  # Options: debug, info, warn, error

# Bittensor Configuration
#TAO_STAT_API_KEY=your_taostat_api_key_here #(uncomment this line if you want to use the Bittensor API)

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

## 🚀 Usage

### Running as a standalone server

Start the MCP server:

```bash
npm start
```

### Integrating with Claude Desktop

1. Open Claude Desktop and navigate to Settings > Developer > Edit Config
2. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "masa-subnet-mcp": {
      "command": "node",
        "args": [
          "path/dist/index.js"
        ]
    }
  }
}
```

3. Restart Claude Desktop
4. Click on the tools icon in the input box to see available tools

## 🧰 Available Tools & Resources

### Tools

- `twitter_search` - Search for tweets on a specific topic
- `twitter_advanced_search` - Search Twitter with advanced filtering
- `index_data` - Index data for future retrieval
- `query_data` - Query previously indexed data
- `bittensor_subnet_info` - Get information about a Bittensor subnet
- `bittensor_subnet_nodes` - List nodes in a Bittensor subnet
- `bittensor_validator_info` - Get information about a validator
- `bittensor_neuron_info` - Get information about a neuron
- `bittensor_network_stats` - Get Bittensor network statistics
- `subnet_info` - Get information about Masa Subnet 42
- `bittensor_search` - Search for entities in the Bittensor network

### Resources

- `twitter-search://{searchId}` - Access Twitter search results
- `bittensor-subnet://{netuid}` - Access Bittensor subnet data
- `bittensor-neuron://{subnet}/{hotkey}` - Access neuron information
- `bittensor-network://{type}` - Access network-level information
- `data://bittensor/{category}/{query}` - Structured data access

## 📚 Documentation

For more detailed information, please refer to:

- [Implementation Guide](docs/IMPLEMENTATION.md)
- [Protocol Specification](docs/SPECIFICATION.md)
- [Masa API Documentation](https://developers.masa.ai/docs/index-API/masa-api-search)
- [Masa Protocol Documentation](https://developers.masa.ai/docs/masa-protocol/environment-setup)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgements

- [Model Context Protocol](https://modelcontextprotocol.io/) for creating the standard
- [Anthropic](https://www.anthropic.com/) for Claude and the Claude Desktop application
- [Bittensor](https://bittensor.com/) for the decentralized machine learning network
- [Masa Subnet 42](https://masa.ai/) for their data infrastructure

---

<p align="center">Made with ❤️ for the Masa Subnet 42 Challenge</p>