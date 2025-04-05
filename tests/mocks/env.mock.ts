import { MasaMode } from '../../src/config/env';

// Mock environment variables
export const env = {
  MASA_MODE: 'API' as MasaMode,
  MASA_API_KEY: 'test-api-key',
  MASA_API_BASE_URL: 'https://api-test.masa.com',
  MASA_PROTOCOL_NODE_URL: 'http://localhost:8080',
  MCP_SERVER_NAME: 'Test MCP Server',
  MCP_SERVER_VERSION: '1.0.0',
  MCP_SERVER_DESCRIPTION: 'Test server description',
  MCP_TRANSPORT_TYPE: 'stdio',
  MCP_HTTP_HOST: 'localhost',
  LOG_LEVEL: 'info',
  TAO_STAT_API_KEY: 'test-tao-key',
};

// Mock the isBittensorEnabled function
export function isBittensorEnabled(): boolean {
  return true;
}

export function getEnv() {
  return env;
}

export { MasaMode };