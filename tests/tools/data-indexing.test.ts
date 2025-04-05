import { registerDataIndexingTool } from '../../src/tools/data-indexing';

// Mock McpServer and MasaService
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
};

const mockIndexData = jest.fn();
const mockQueryData = jest.fn();
const mockMasaService = {
  indexData: mockIndexData,
  queryData: mockQueryData,
};

describe('Data Indexing Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDataIndexingTool', () => {
    it('should register index_data and query_data tools with the server', () => {
      // Execute
      registerDataIndexingTool(mockServer as any, mockMasaService as any);

      // Verify
      expect(mockTool).toHaveBeenCalledTimes(2);
      expect(mockTool.mock.calls[0][0]).toBe('index_data');
      expect(mockTool.mock.calls[1][0]).toBe('query_data');
    });
  });

  describe('index_data tool', () => {
    it('should handle indexing json data correctly', async () => {
      // Setup
      let indexDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'index_data') {
          indexDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(indexDataCallback).toBeDefined();
      
      const params = {
        data: { name: 'Test Data', value: 123 },
        metadata: { source: 'unit test' },
        namespace: 'twitter',
      };
      
      const mockResult = {
        id: 'index123',
        status: 'success',
        message: 'Data indexed successfully',
      };
      
      mockIndexData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (indexDataCallback as Function)(params);

      // Verify
      expect(mockIndexData).toHaveBeenCalledWith(params);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Data indexed successfully in twitter namespace');
      expect(result.content[0].text).toContain('Job ID: index123');
    });

    it('should handle string data by parsing it as JSON', async () => {
      // Setup
      let indexDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'index_data') {
          indexDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(indexDataCallback).toBeDefined();
      
      const jsonString = '{"name":"Test Data","value":123}';
      const params = {
        data: jsonString,
        namespace: 'bittensor',
      };
      
      const mockResult = {
        id: 'index456',
        status: 'success',
      };
      
      mockIndexData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (indexDataCallback as Function)(params);

      // Verify
      expect(mockIndexData).toHaveBeenCalledWith(expect.objectContaining({
        namespace: 'bittensor',
      }));
      expect(result.content[0].text).toContain('Data indexed successfully in bittensor namespace');
    });

    it('should handle null or undefined data with an error', async () => {
      // Setup
      let indexDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'index_data') {
          indexDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(indexDataCallback).toBeDefined();
      
      const params = {
        data: null,
        namespace: 'twitter',
      };

      // Execute
      const result = await (indexDataCallback as Function)(params);

      // Verify
      expect(mockIndexData).not.toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error: data is required');
      expect(result.isError).toBe(true);
    });

    it('should handle errors during data indexing', async () => {
      // Setup
      let indexDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'index_data') {
          indexDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(indexDataCallback).toBeDefined();
      
      const params = {
        data: { test: 'data' },
        namespace: 'twitter',
      };
      
      const error = new Error('Indexing error');
      mockIndexData.mockRejectedValueOnce(error);

      // Execute
      const result = await (indexDataCallback as Function)(params);

      // Verify
      expect(mockIndexData).toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error indexing data');
      expect(result.isError).toBe(true);
    });

    it('should normalize namespace to twitter if no namespace is provided', async () => {
      // Setup
      let indexDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'index_data') {
          indexDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(indexDataCallback).toBeDefined();
      
      const params = {
        data: { test: 'data' },
        // No namespace provided
      };
      
      const mockResult = {
        id: 'index789',
        status: 'success',
      };
      
      mockIndexData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (indexDataCallback as Function)(params);

      // Verify
      expect(mockIndexData).toHaveBeenCalledWith(expect.objectContaining({
        namespace: 'twitter', // Default namespace
      }));
      expect(result.content[0].text).toContain('Data indexed successfully in twitter namespace');
    });
  });

  describe('query_data tool', () => {
    it('should handle querying data correctly', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'test query',
        namespace: 'twitter',
        limit: 10,
        offset: 0,
      };
      
      const mockResult = {
        data: [
          { id: 1, content: 'Result 1' },
          { id: 2, content: 'Result 2' },
        ],
        total: 25,
        hasMore: true,
      };
      
      mockQueryData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (queryDataCallback as Function)(params);

      // Verify
      expect(mockQueryData).toHaveBeenCalledWith(params);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 results for query: test query in twitter namespace');
      expect(result.content[0].text).toContain('Showing 0-2 of 25');
    });

    it('should handle empty query results', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'no results query',
        namespace: 'bittensor',
      };
      
      const mockResult = {
        data: [],
        total: 0,
        hasMore: false,
      };
      
      mockQueryData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (queryDataCallback as Function)(params);

      // Verify
      expect(mockQueryData).toHaveBeenCalledWith(expect.objectContaining({
        namespace: 'bittensor',
      }));
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No data found for query: no results query in bittensor data');
    });

    it('should handle invalid namespace by using twitter as fallback', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'test query',
        namespace: 'invalid',
      };
      
      const mockResult = {
        data: [{ id: 1, content: 'Result' }],
        total: 1,
        hasMore: false,
      };
      
      mockQueryData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (queryDataCallback as Function)(params);

      // Verify
      expect(mockQueryData).toHaveBeenCalledWith(expect.objectContaining({
        namespace: 'twitter', // Normalized to twitter
      }));
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 results for query: test query in twitter namespace');
    });
    
    it('should handle errors during data query', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'error query',
      };
      
      const error = new Error('Query error');
      mockQueryData.mockRejectedValueOnce(error);

      // Execute
      const result = await (queryDataCallback as Function)(params);

      // Verify
      expect(mockQueryData).toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error querying data: Query error');
      expect(result.isError).toBe(true);
    });

    it('should use default limit and offset if not provided', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'default params query',
        namespace: 'twitter',
        // No limit or offset
      };
      
      const mockResult = {
        data: [{ id: 1, content: 'Result' }],
        total: 1,
        hasMore: false,
      };
      
      mockQueryData.mockResolvedValueOnce(mockResult);

      // Execute
      await (queryDataCallback as Function)(params);

      // Verify
      expect(mockQueryData).toHaveBeenCalledWith(expect.objectContaining({
        query: 'default params query',
        namespace: 'twitter',
        // Default values should be applied by the implementation
      }));
    });

    it('should format JSON results correctly', async () => {
      // Setup
      let queryDataCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'query_data') {
          queryDataCallback = callback;
        }
      });
      
      registerDataIndexingTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(queryDataCallback).toBeDefined();
      
      const params = {
        query: 'json format test',
        namespace: 'twitter',
      };
      
      const mockResult = {
        data: [
          { id: 1, name: 'Test 1', complex: { nested: true } },
          { id: 2, name: 'Test 2', complex: { nested: false } }
        ],
        total: 2,
        hasMore: false,
      };
      
      mockQueryData.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (queryDataCallback as Function)(params);

      // Verify
      expect(result.content[0].type).toBe('text');
      
      // The response should contain a JSON-formatted string with proper indentation
      const responseText = result.content[0].text;
      expect(responseText).toContain('"query": "json format test"');
      expect(responseText).toContain('"namespace": "twitter"');
      expect(responseText).toContain('"total": 2');
      expect(responseText).toContain('"hasMore": false');
      expect(responseText).toContain('"results":');
      
      // Check that complex objects are properly formatted
      expect(responseText).toContain('"complex": {');
      expect(responseText).toContain('"nested": true');
    });
  });
});