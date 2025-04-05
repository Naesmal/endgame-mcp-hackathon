import { registerBittensorInfoTool } from '../../src/tools/bittensor-info';

// Mock McpServer and BittensorService
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
};

// Create mock service methods
const mockGetSubnetInfo = jest.fn();
const mockGetSubnetNodes = jest.fn();
const mockGetValidatorInfo = jest.fn();
const mockGetNeuronInfo = jest.fn();
const mockGetNetworkStats = jest.fn();

const mockBittensorService = {
  getSubnetInfo: mockGetSubnetInfo,
  getSubnetNodes: mockGetSubnetNodes,
  getValidatorInfo: mockGetValidatorInfo,
  getNeuronInfo: mockGetNeuronInfo,
  getNetworkStats: mockGetNetworkStats,
};

describe('Bittensor Info Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerBittensorInfoTool', () => {
    it('should register all bittensor info tools with the server', () => {
      // Execute
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);

      // Verify
      expect(mockTool).toHaveBeenCalledTimes(6);
      expect(mockTool.mock.calls[0][0]).toBe('bittensor_subnet_info');
      expect(mockTool.mock.calls[1][0]).toBe('bittensor_subnet_nodes');
      expect(mockTool.mock.calls[2][0]).toBe('bittensor_validator_info');
      expect(mockTool.mock.calls[3][0]).toBe('bittensor_neuron_info');
      expect(mockTool.mock.calls[4][0]).toBe('bittensor_network_stats');
      expect(mockTool.mock.calls[5][0]).toBe('subnet_info');
    });
  });

  describe('bittensor_subnet_info tool', () => {
    it('should handle retrieving all subnets', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = {};
      
      const mockSubnets = [
        {
          netuid: 1,
          name: 'Subnet 1',
          description: 'Test subnet 1',
          owner: 'owner1',
          totalValidators: 10,
          totalMiners: 20,
          totalStake: 1000,
          lastUpdated: '2023-01-01',
        },
        {
          netuid: 2,
          name: 'Subnet 2',
          description: 'Test subnet 2',
          owner: 'owner2',
          totalValidators: 5,
          totalMiners: 15,
          totalStake: 500,
          lastUpdated: '2023-01-01',
        }
      ];
      
      mockGetSubnetInfo.mockResolvedValueOnce(mockSubnets);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetSubnetInfo).toHaveBeenCalledWith(undefined);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 Bittensor subnets');
    });

    it('should handle retrieving a specific subnet', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = { netuid: 1 };
      
      const mockSubnet = {
        netuid: 1,
        name: 'Subnet 1',
        description: 'Test subnet 1',
        owner: 'owner1',
        totalValidators: 10,
        totalMiners: 20,
        totalStake: 1000,
        lastUpdated: '2023-01-01',
      };
      
      mockGetSubnetInfo.mockResolvedValueOnce(mockSubnet);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetSubnetInfo).toHaveBeenCalledWith(1);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Bittensor Subnet 1 Information');
      expect(result.content[0].text).toContain('Name: Subnet 1');
    });

    it('should handle errors when retrieving subnet info', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = { netuid: 999 };
      
      const error = new Error('Subnet not found');
      mockGetSubnetInfo.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving Bittensor subnet info');
      expect(result.isError).toBe(true);
    });
  });

  describe('bittensor_subnet_nodes tool', () => {
    it('should handle retrieving nodes in a subnet', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_nodes') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = {
        netuid: 1,
        limit: 20,
        offset: 0
      };
      
      const mockNodes = [
        {
          uid: 1,
          hotkey: '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          type: 'validator',
          rank: 0.9876,
          stake: 100,
          emission: 0.1234,
        },
        {
          uid: 2,
          hotkey: '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef2345678901',
          type: 'miner',
          rank: 0.8765,
          stake: 50,
          emission: 0.0987,
        }
      ];
      
      mockGetSubnetNodes.mockResolvedValueOnce(mockNodes);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetSubnetNodes).toHaveBeenCalledWith(1, 20, 0);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 nodes in Bittensor subnet 1');
      expect(result.content[0].text).toContain('Validators: 1');
      expect(result.content[0].text).toContain('Miners: 1');
    });

    it('should handle empty node list', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_nodes') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = {
        netuid: 999,
        limit: 20,
        offset: 0
      };
      
      mockGetSubnetNodes.mockResolvedValueOnce([]);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('No nodes found for Bittensor subnet 999');
    });

    it('should handle errors when retrieving subnet nodes', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_subnet_nodes') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const params = {
        netuid: 1,
        limit: 20,
        offset: 0
      };
      
      const error = new Error('Failed to retrieve nodes');
      mockGetSubnetNodes.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving Bittensor subnet nodes');
      expect(result.isError).toBe(true);
    });
  });

  describe('bittensor_validator_info tool', () => {
    it('should handle retrieving validator info', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_validator_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const params = { hotkey };
      
      const mockValidator = {
        hotkey,
        coldkey: 'coldkey1',
        stake: 100,
        delegatedStake: 50,
        totalStake: 150,
        subnets: [
          { netuid: 1, rank: 0.9876, emission: 0.1234 },
          { netuid: 2, rank: 0.8765, emission: 0.0987 }
        ],
        delegations: [
          { hotkey: 'delegator1', amount: 25 },
          { hotkey: 'delegator2', amount: 25 }
        ],
        lastUpdate: '2023-01-01'
      };
      
      mockGetValidatorInfo.mockResolvedValueOnce(mockValidator);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetValidatorInfo).toHaveBeenCalledWith(hotkey);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Bittensor Validator Information');
      expect(result.content[0].text).toContain('Hotkey: ' + hotkey);
      expect(result.content[0].text).toContain('Subnets:');
      expect(result.content[0].text).toContain('Delegations:');
    });

    it('should handle validator with no subnets', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_validator_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const params = { hotkey };
      
      const mockValidator = {
        hotkey,
        coldkey: 'coldkey1',
        stake: 100,
        delegatedStake: 50,
        totalStake: 150,
        subnets: [],
        delegations: [],
        lastUpdate: '2023-01-01'
      };
      
      mockGetValidatorInfo.mockResolvedValueOnce(mockValidator);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No subnets registered');
      expect(result.content[0].text).toContain('No delegations');
    });

    it('should handle errors when retrieving validator info', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_validator_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const params = { hotkey };
      
      const error = new Error('Validator not found');
      mockGetValidatorInfo.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving Bittensor validator info');
      expect(result.isError).toBe(true);
    });
  });

  describe('bittensor_neuron_info tool', () => {
    it('should handle retrieving neuron info without specific subnet', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_neuron_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const params = { hotkey };
      
      const mockNeuron = {
        hotkey,
        coldkey: 'coldkey1',
        uid: 1,
        netuid: 1,
        subnetName: 'Subnet 1',
        stake: 100,
        rank: 0.9876,
        emission: 0.1234,
        trust: 0.9,
        consensus: 0.8,
        type: 'validator',
        lastUpdate: '2023-01-01'
      };
      
      mockGetNeuronInfo.mockResolvedValueOnce(mockNeuron);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey, undefined);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Bittensor Neuron Information');
      expect(result.content[0].text).toContain('Hotkey: ' + hotkey);
      expect(result.content[0].text).toContain('Subnet: 1 (Subnet 1)');
    });

    it('should handle retrieving neuron info with specific subnet', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_neuron_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const netuid = 1;
      const params = { hotkey, netuid };
      
      const mockNeuron = {
        hotkey,
        coldkey: 'coldkey1',
        uid: 1,
        netuid,
        stake: 100,
        rank: 0.9876,
        emission: 0.1234,
        trust: 0.9,
        consensus: 0.8,
        type: 'validator',
        lastUpdate: '2023-01-01'
      };
      
      mockGetNeuronInfo.mockResolvedValueOnce(mockNeuron);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey, netuid);
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Bittensor Neuron Information');
    });

    it('should handle errors when retrieving neuron info', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_neuron_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const params = { hotkey };
      
      const error = new Error('Neuron not found');
      mockGetNeuronInfo.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving Bittensor neuron info');
      expect(result.isError).toBe(true);
    });
  });

  describe('bittensor_network_stats tool', () => {
    it('should handle retrieving network statistics', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_network_stats') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const mockStats = {
        totalSubnets: 5,
        totalNeurons: 100,
        totalValidators: 30,
        totalMiners: 70,
        totalStake: 5000,
        tao: {
          price: 123.45,
          marketCap: 1234567890,
          volume24h: 12345678,
          circulatingSupply: 10000000,
          totalSupply: 11000000
        },
        blockNumber: 12345,
        blockTime: 12,
        lastUpdated: '2023-01-01T00:00:00Z'
      };
      
      mockGetNetworkStats.mockResolvedValueOnce(mockStats);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!({});

      // Verify
      expect(mockGetNetworkStats).toHaveBeenCalled();
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Bittensor Network Statistics');
      expect(result.content[0].text).toContain('Total Subnets: 5');
      expect(result.content[0].text).toContain('TAO Token Information');
    });

    it('should handle network stats without TAO information', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_network_stats') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const mockStats = {
        totalSubnets: 5,
        totalNeurons: 100,
        totalValidators: 30,
        totalMiners: 70,
        totalStake: 5000,
        tao: null, // No TAO info
        blockNumber: 12345,
        blockTime: 12,
        lastUpdated: '2023-01-01T00:00:00Z'
      };
      
      mockGetNetworkStats.mockResolvedValueOnce(mockStats);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!({});

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).not.toContain('TAO Token Information');
    });

    it('should handle errors when retrieving network stats', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_network_stats') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const error = new Error('Network stats unavailable');
      mockGetNetworkStats.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!({});

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error retrieving Bittensor network stats');
      expect(result.isError).toBe(true);
    });
  });

  describe('subnet_info tool', () => {
    it('should provide basic subnet info with Bittensor data', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'subnet_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const mockStats = {
        totalSubnets: 5,
        totalNeurons: 100,
        totalValidators: 30,
        totalMiners: 70,
        tao: {
          price: 123.45,
          marketCap: 1234567890
        },
        lastUpdated: '2023-01-01T00:00:00Z'
      };
      
      mockGetNetworkStats.mockResolvedValueOnce(mockStats);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!({});

      // Verify
      expect(mockGetNetworkStats).toHaveBeenCalled();
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Subnet: Masa Subnet 42 (Bittensor Gateway)');
      expect(result.content[0].text).toContain(`Nodes: ${mockStats.totalValidators}/${mockStats.totalNeurons}`);
      expect(result.content[0].text).toContain(`Subnets: ${mockStats.totalSubnets}`);
      expect(result.content[0].text).toContain('TAO Token:');
    });

    it('should handle errors when retrieving subnet info', async () => {
      // Setup - Capture the callback when registering the tool
      let capturedCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'subnet_info') {
          capturedCallback = callback;
        }
      });
      
      registerBittensorInfoTool(mockServer as any, mockBittensorService as any);
      
      // Ensure we captured the callback
      expect(capturedCallback).toBeDefined();
      
      const error = new Error('Stats unavailable');
      mockGetNetworkStats.mockRejectedValueOnce(error);

      // Execute - Using non-null assertion because we've verified it's defined
      const result = await capturedCallback!({});

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error getting subnet info');
      expect(result.isError).toBe(true);
    });
  });
});