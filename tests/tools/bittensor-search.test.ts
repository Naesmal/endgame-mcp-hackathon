import { registerBittensorSearchTool } from '../../src/tools/bittensor-search';

// Mock McpServer and BittensorService
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
};

// Create mock service methods
const mockGetSubnetInfo = jest.fn();
const mockGetValidatorInfo = jest.fn();
const mockGetNeuronInfo = jest.fn();

const mockBittensorService = {
  getSubnetInfo: mockGetSubnetInfo,
  getValidatorInfo: mockGetValidatorInfo,
  getNeuronInfo: mockGetNeuronInfo,
};

describe('Bittensor Search Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerBittensorSearchTool', () => {
    it('should register bittensor_search tool with the server', () => {
      // Execute
      registerBittensorSearchTool(mockServer as any, mockBittensorService as any);

      // Verify
      expect(mockTool).toHaveBeenCalledTimes(1);
      expect(mockTool.mock.calls[0][0]).toBe('bittensor_search');
    });
  });

  describe('bittensor_search tool', () => {
    let searchCallback: Function;
    
    beforeEach(() => {
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'bittensor_search') {
          searchCallback = callback;
        }
      });
      
      registerBittensorSearchTool(mockServer as any, mockBittensorService as any);
    });

    // Generic search (no type specified)
    describe('generic search (no type)', () => {
      it('should search for subnet when query is a valid subnet ID', async () => {
        // Setup
        const params = {
          query: '1'
        };
        
        const mockSubnet = {
          netuid: 1,
          name: 'Subnet 1',
          description: 'Test subnet',
          owner: 'owner1',
          totalValidators: 10,
          totalMiners: 20,
          totalStake: 1000,
        };
        
        mockGetSubnetInfo.mockResolvedValueOnce(mockSubnet);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetSubnetInfo).toHaveBeenCalledWith(1);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found Subnet 1');
      });

      it('should search for validator when query is a valid hotkey', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey
        };
        
        const mockValidator = {
          hotkey,
          coldkey: 'coldkey1',
          stake: 100,
          delegatedStake: 50,
          totalStake: 150,
          subnets: [
            { netuid: 1, rank: 0.9, emission: 0.1 }
          ]
        };
        
        // Subnet search will fail first
        mockGetSubnetInfo.mockImplementation(() => {
          throw new Error('Not a subnet ID');
        });
        
        mockGetValidatorInfo.mockResolvedValueOnce(mockValidator);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetValidatorInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found validator with hotkey');
      });

      it('should search for neuron when validator search fails', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey
        };
        
        const mockNeuron = {
          hotkey,
          type: 'miner',
          netuid: 1,
          subnetName: 'Subnet 1',
          uid: 5,
          rank: 0.8,
          stake: 50,
        };
        
        // Subnet search will fail first
        mockGetSubnetInfo.mockImplementation(() => {
          throw new Error('Not a subnet ID');
        });
        
        // Validator search will fail
        mockGetValidatorInfo.mockImplementation(() => {
          throw new Error('Not a validator');
        });
        
        mockGetNeuronInfo.mockResolvedValueOnce(mockNeuron);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found neuron with hotkey');
      });

      it('should search by subnet name if other searches fail', async () => {
        // Setup
        const params = {
          query: 'text'
        };
        
        const mockSubnets = [
          {
            netuid: 1,
            name: 'Text Processing',
            description: 'Subnet for text processing',
            totalValidators: 10,
            totalMiners: 20,
            totalStake: 1000,
          },
          {
            netuid: 2,
            name: 'Vision',
            description: 'This subnet handles text to image generation',
            totalValidators: 5,
            totalMiners: 15,
            totalStake: 500,
          }
        ];
        
        // Subnet ID search will fail
        mockGetSubnetInfo.mockImplementationOnce(() => {
          throw new Error('Not a subnet ID');
        });
        
        // Then for the name search it should return subnets
        mockGetSubnetInfo.mockResolvedValueOnce(mockSubnets);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetSubnetInfo).toHaveBeenCalledTimes(2);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found 2 subnet(s) matching "text"');
      });

      it('should return not found message if all searches fail', async () => {
        // Setup
        const params = {
          query: 'nonexistent'
        };
        
        // Subnet ID search will fail
        mockGetSubnetInfo.mockImplementationOnce(() => {
          throw new Error('Not a subnet ID');
        });
        
        // Name search will return empty array
        mockGetSubnetInfo.mockResolvedValueOnce([]);
        
        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('No Bittensor data found for query');
      });
    });

    // Type-specific searches
    describe('subnet type search', () => {
      it('should search subnet by ID', async () => {
        // Setup
        const params = {
          query: '1',
          type: 'subnet'
        };
        
        const mockSubnet = {
          netuid: 1,
          name: 'Subnet 1',
          description: 'Test subnet',
          owner: 'owner1',
          totalValidators: 10,
          totalMiners: 20,
          totalStake: 1000,
        };
        
        mockGetSubnetInfo.mockResolvedValueOnce(mockSubnet);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetSubnetInfo).toHaveBeenCalledWith(1);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found Subnet 1');
      });

      it('should search subnet by name', async () => {
        // Setup
        const params = {
          query: 'vision',
          type: 'subnet'
        };
        
        // First attempt for ID will fail
        mockGetSubnetInfo.mockImplementationOnce(() => {
          throw new Error('Not a valid subnet ID');
        });
        
        const mockSubnets = [
          {
            netuid: 2,
            name: 'Vision',
            description: 'Computer vision subnet',
            totalValidators: 5,
            totalMiners: 15,
            totalStake: 500,
          },
          {
            netuid: 3,
            name: 'Text to Vision',
            description: 'Text to image subnet',
            totalValidators: 8,
            totalMiners: 12,
            totalStake: 800,
          }
        ];
        
        mockGetSubnetInfo.mockResolvedValueOnce(mockSubnets);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetSubnetInfo).toHaveBeenCalledTimes(2);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found 2 subnet(s) matching "vision"');
      });

      it('should return not found for subnet', async () => {
        // Setup
        const params = {
          query: 'nonexistent',
          type: 'subnet'
        };
        
        // Subnet ID search will fail
        mockGetSubnetInfo.mockImplementationOnce(() => {
          throw new Error('Not a subnet ID');
        });
        
        // Name search will return empty array
        mockGetSubnetInfo.mockResolvedValueOnce([]);
        
        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('No subnets found matching query');
      });
    });

    describe('validator type search', () => {
      it('should search validator by hotkey', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey,
          type: 'validator'
        };
        
        const mockValidator = {
          hotkey,
          coldkey: 'coldkey1',
          stake: 100,
          delegatedStake: 50,
          totalStake: 150,
          subnets: [
            { netuid: 1, rank: 0.9, emission: 0.1 }
          ]
        };
        
        mockGetValidatorInfo.mockResolvedValueOnce(mockValidator);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetValidatorInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found validator with hotkey');
      });

      it('should return not found for invalid validator hotkey', async () => {
        // Setup
        const params = {
          query: 'invalid-hotkey',
          type: 'validator'
        };
        
        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetValidatorInfo).not.toHaveBeenCalled();
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Invalid validator search query');
      });

      it('should handle validator not found', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey,
          type: 'validator'
        };
        
        mockGetValidatorInfo.mockImplementation(() => {
          throw new Error('Validator not found');
        });

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetValidatorInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('No validator found with hotkey');
      });
    });

    describe('neuron type search', () => {
      it('should search neuron by netuid/hotkey format', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: `1/${hotkey}`,
          type: 'neuron'
        };
        
        const mockNeuron = {
          hotkey,
          type: 'miner',
          netuid: 1,
          uid: 5,
          rank: 0.8,
          stake: 50,
        };
        
        mockGetNeuronInfo.mockResolvedValueOnce(mockNeuron);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey, 1);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found neuron with hotkey');
      });

      it('should search neuron by just hotkey', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey,
          type: 'neuron'
        };
        
        const mockNeuron = {
          hotkey,
          type: 'validator',
          netuid: 1,
          uid: 5,
          rank: 0.8,
          stake: 50,
        };
        
        mockGetNeuronInfo.mockResolvedValueOnce(mockNeuron);

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Found neuron with hotkey');
      });

      it('should return error for invalid neuron query format', async () => {
        // Setup
        const params = {
          query: 'invalid-query',
          type: 'neuron'
        };
        
        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetNeuronInfo).not.toHaveBeenCalled();
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Invalid neuron search query');
      });

      it('should handle neuron not found', async () => {
        // Setup
        const hotkey = '5abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
        const params = {
          query: hotkey,
          type: 'neuron'
        };
        
        mockGetNeuronInfo.mockImplementation(() => {
          throw new Error('Neuron not found');
        });

        // Execute
        const result = await searchCallback(params);

        // Verify
        expect(mockGetNeuronInfo).toHaveBeenCalledWith(hotkey);
        expect(result).toHaveProperty('content');
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('No neuron found with hotkey');
      });
    });

    it('should return error for invalid search type', async () => {
      // Setup
      const params = {
        query: 'test',
        type: 'invalid' as any
      };
      
      // Execute
      const result = await searchCallback(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Invalid search type');
      expect(result.isError).toBe(true);
    });

    it('should handle general errors during search', async () => {
      // Setup
      const params = {
        query: 'test'
      };
      
      // Mock a general error
      mockGetSubnetInfo.mockImplementation(() => {
        throw new Error('Critical error');
      });

      // Execute
      const result = await searchCallback(params);

      // Verify
      expect(result).toHaveProperty('content');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error performing Bittensor search');
      expect(result.isError).toBe(true);
    });
  });
});