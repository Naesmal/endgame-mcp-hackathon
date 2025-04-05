import { MasaSubnetMcpServer } from '../../src/server/mcp-server';
import { MasaServiceFactory } from '../../src/services/masa-service';
import { BittensorServiceFactory } from '../../src/services/bittensor-service';
import { TransportFactory } from '../../src/server/transport';
import { isBittensorEnabled } from '../../src/config/env';

// Mock the dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    tool: jest.fn(),
  })),
}));

jest.mock('../../src/services/masa-service', () => ({
  MasaServiceFactory: {
    createService: jest.fn(),
  },
}));

jest.mock('../../src/services/bittensor-service', () => ({
  BittensorServiceFactory: {
    createService: jest.fn(),
  },
}));

jest.mock('../../src/server/transport', () => ({
  TransportFactory: {
    createTransport: jest.fn(),
    setupSSERoutes: jest.fn(),
    shutdownServer: jest.fn(),
    sendUserMessage: jest.fn(),
  },
}));

jest.mock('../../src/config/env', () => ({
  env: {
    MCP_SERVER_NAME: 'Test Server',
    MCP_SERVER_VERSION: '1.0.0',
    MCP_SERVER_DESCRIPTION: 'Test Description',
    MASA_MODE: 'API',
  },
  isBittensorEnabled: jest.fn(),
}));

// Mock the tool registration modules
jest.mock('../../src/tools/twitter-search', () => ({
  registerTwitterSearchTool: jest.fn(),
}));

jest.mock('../../src/tools/data-indexing', () => ({
  registerDataIndexingTool: jest.fn(),
}));

jest.mock('../../src/tools/bittensor-info', () => ({
  registerBittensorInfoTool: jest.fn(),
}));

jest.mock('../../src/tools/bittensor-search', () => ({
  registerBittensorSearchTool: jest.fn(),
}));

// Mock the resource registration modules
jest.mock('../../src/resources/data-resource', () => ({
  registerDataResource: jest.fn(),
}));

jest.mock('../../src/resources/bittensor-resource', () => ({
  registerBittensorResource: jest.fn(),
}));

jest.mock('../../src/resources/bittensor-data', () => ({
  registerBittensorDataResource: jest.fn(),
}));

describe('MasaSubnetMcpServer', () => {
  let server: MasaSubnetMcpServer;
  const mockMasaService = { searchTwitter: jest.fn() };
  const mockBittensorService = { getSubnetInfo: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (MasaServiceFactory.createService as jest.Mock).mockResolvedValue(mockMasaService);
    (BittensorServiceFactory.createService as jest.Mock).mockResolvedValue(mockBittensorService);
    (TransportFactory.createTransport as jest.Mock).mockReturnValue({ type: 'stdio' });
    
    server = new MasaSubnetMcpServer();
  });

  describe('constructor', () => {
    it('should create an instance of McpServer with correct configuration', () => {
      // Verify
      expect(require('@modelcontextprotocol/sdk/server/mcp.js').McpServer).toHaveBeenCalledWith({
        name: 'Test Server',
        version: '1.0.0',
        description: 'Test Description',
      });
    });
  });

  describe('initialize', () => {
    it('should initialize the server with required services and tools when Bittensor is enabled', async () => {
      // Setup
      (isBittensorEnabled as jest.Mock).mockReturnValue(true);
      
      // Execute
      await server.initialize();

      // Verify services creation
      expect(MasaServiceFactory.createService).toHaveBeenCalledWith('API');
      expect(BittensorServiceFactory.createService).toHaveBeenCalled();
      
      // Verify tools registration
      expect(require('../../src/tools/twitter-search').registerTwitterSearchTool).toHaveBeenCalled();
      expect(require('../../src/tools/data-indexing').registerDataIndexingTool).toHaveBeenCalled();
      expect(require('../../src/tools/bittensor-info').registerBittensorInfoTool).toHaveBeenCalled();
      expect(require('../../src/tools/bittensor-search').registerBittensorSearchTool).toHaveBeenCalled();
      
      // Verify resources registration
      expect(require('../../src/resources/data-resource').registerDataResource).toHaveBeenCalled();
      expect(require('../../src/resources/bittensor-resource').registerBittensorResource).toHaveBeenCalled();
      expect(require('../../src/resources/bittensor-data').registerBittensorDataResource).toHaveBeenCalled();
    });

    it('should initialize without Bittensor tools when Bittensor is disabled', async () => {
      // Setup
      (isBittensorEnabled as jest.Mock).mockReturnValue(false);
      
      // Execute
      await server.initialize();

      // Verify services creation
      expect(MasaServiceFactory.createService).toHaveBeenCalledWith('API');
      expect(BittensorServiceFactory.createService).toHaveBeenCalled();
      
      // Verify only Twitter and data indexing tools registration
      expect(require('../../src/tools/twitter-search').registerTwitterSearchTool).toHaveBeenCalled();
      expect(require('../../src/tools/data-indexing').registerDataIndexingTool).toHaveBeenCalled();
      
      // Bittensor tools should not be registered
      expect(require('../../src/tools/bittensor-info').registerBittensorInfoTool).not.toHaveBeenCalled();
      expect(require('../../src/tools/bittensor-search').registerBittensorSearchTool).not.toHaveBeenCalled();
      
      // Only Twitter resources should be registered
      expect(require('../../src/resources/data-resource').registerDataResource).toHaveBeenCalled();
      expect(require('../../src/resources/bittensor-resource').registerBittensorResource).not.toHaveBeenCalled();
      expect(require('../../src/resources/bittensor-data').registerBittensorDataResource).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start the server with the appropriate transport', async () => {
      // Setup
      await server.initialize();
      
      // Execute
      server.start({ httpPort: 3030, httpHost: 'localhost' });

      // Verify
      expect(TransportFactory.createTransport).toHaveBeenCalledWith({
        httpPort: 3030,
        httpHost: 'localhost',
      });
      expect(TransportFactory.sendUserMessage).toHaveBeenCalled();
    });

    it('should setup SSE routes for HTTP transport', async () => {
      // Setup
      await server.initialize();
      process.env.MCP_TRANSPORT_TYPE = 'http';
      (TransportFactory.createTransport as jest.Mock).mockReturnValue({ type: 'http' });
      
      // Execute
      server.start();

      // Verify
      expect(TransportFactory.setupSSERoutes).toHaveBeenCalled();
      expect(TransportFactory.sendUserMessage).toHaveBeenCalled();
      
      // Reset
      process.env.MCP_TRANSPORT_TYPE = 'stdio';
    });
  });

  describe('stop', () => {
    it('should stop the HTTP server when using HTTP transport', async () => {
      // Setup
      await server.initialize();
      process.env.MCP_TRANSPORT_TYPE = 'http';
      
      // Execute
      server.stop();

      // Verify
      expect(TransportFactory.shutdownServer).toHaveBeenCalled();
      
      // Reset
      process.env.MCP_TRANSPORT_TYPE = 'stdio';
    });

    it('should handle stdio transport stop gracefully', async () => {
      // Setup
      await server.initialize();
      process.env.MCP_TRANSPORT_TYPE = 'stdio';
      
      // Execute
      server.stop();

      // No specific verification needed for stdio
      expect(TransportFactory.shutdownServer).not.toHaveBeenCalled();
    });
  });
});