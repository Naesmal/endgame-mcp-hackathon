import { registerTwitterSearchTool } from '../../src/tools/twitter-search';

// Mock McpServer and MasaService
const mockTool = jest.fn();
const mockServer = {
  tool: mockTool,
};

const mockSearchTwitter = jest.fn();
const mockMasaService = {
  searchTwitter: mockSearchTwitter,
};

describe('Twitter Search Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTwitterSearchTool', () => {
    it('should register twitter_search tool with the server', () => {
      // Execute
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);

      // Verify
      expect(mockTool).toHaveBeenCalledTimes(2);
      expect(mockTool.mock.calls[0][0]).toBe('twitter_search');
    });

    it('should handle twitter_search execution correctly', async () => {
      // Setup
      let searchToolCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_search') {
          searchToolCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(searchToolCallback).toBeDefined();
      
      const params = {
        query: 'test query',
        count: 5,
      };
      
      const mockResult = {
        id: 'search123',
        data: [
          { Tweet: { ID: '1', Text: 'Test tweet 1', Username: 'user1', CreatedAt: '2023-01-01' } },
          { Tweet: { ID: '2', Text: 'Test tweet 2', Username: 'user2', CreatedAt: '2023-01-02' } },
        ],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (searchToolCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query',
        count: 5
      }));
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 tweets for "test query"');
      expect(result.content[0].text).toContain('search123');
    });

    it('should handle sinceDays parameter correctly', async () => {
      // Setup
      let searchToolCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_search') {
          searchToolCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(searchToolCallback).toBeDefined();
      
      // Mock date to have consistent test results
      const realDate = global.Date;
      const mockDate = new Date('2023-01-15T12:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.UTC = realDate.UTC;
      global.Date.parse = realDate.parse;
      global.Date.now = realDate.now;
      
      const params = {
        query: 'test query',
        count: 5,
        sinceDays: 7,
      };
      
      const mockResult = {
        id: 'search456',
        data: [{ Tweet: { ID: '1', Text: 'Test tweet', Username: 'user1', CreatedAt: '2023-01-10' } }],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (searchToolCallback as Function)(params);

      // Restore original Date
      global.Date = realDate;

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query',
        count: 5,
        fromDate: '2023-01-08' // 7 days before the mock date
      }));
      expect(result.content[0].type).toBe('text');
    });

    it('should handle empty search results', async () => {
      // Setup
      let searchToolCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_search') {
          searchToolCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(searchToolCallback).toBeDefined();
      
      const params = {
        query: 'no results query',
      };
      
      const mockResult = {
        id: 'empty123',
        data: [],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (searchToolCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: 'no results query',
        count: 10  // Default count
      }));
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('No tweets found for query: no results query');
    });

    it('should handle errors during search', async () => {
      // Setup
      let searchToolCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_search') {
          searchToolCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(searchToolCallback).toBeDefined();
      
      const params = {
        query: 'error query',
      };
      
      const error = new Error('API error');
      mockSearchTwitter.mockRejectedValueOnce(error);

      // Execute
      const result = await (searchToolCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.anything());
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Error searching Twitter: API error');
      expect(result.isError).toBe(true);
    });
  });

  describe('twitter_advanced_search tool', () => {
    it('should register twitter_advanced_search tool with the server', () => {
      // Execute
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);

      // Verify
      expect(mockTool).toHaveBeenCalledTimes(2);
      expect(mockTool.mock.calls[1][0]).toBe('twitter_advanced_search');
    });

    it('should handle advanced search execution correctly', async () => {
      // Setup
      let advancedSearchCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_advanced_search') {
          advancedSearchCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(advancedSearchCallback).toBeDefined();
      
      const params = {
        query: 'climate change',
        fromUser: 'elonmusk',
        hashtags: ['environment', 'tech'],
        minLikes: 100,
        minRetweets: 50,
        count: 5,
        excludeRetweets: true,
      };
      
      const mockResult = {
        id: 'adv123',
        data: [
          { Tweet: { ID: '3', Text: 'Advanced tweet', Username: 'elonmusk', CreatedAt: '2023-01-03' } },
        ],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (advancedSearchCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: expect.stringContaining('climate change from:elonmusk #environment OR #tech min_faves:100 min_retweets:50 -filter:retweets'),
        count: 5,
      }));
      
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 tweets for advanced query');
    });

    it('should handle date range parameters', async () => {
      // Setup
      let advancedSearchCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_advanced_search') {
          advancedSearchCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(advancedSearchCallback).toBeDefined();
      
      const params = {
        query: 'test query',
        fromDate: '2023-01-01',
        toDate: '2023-01-31',
      };
      
      const mockResult = {
        id: 'date123',
        data: [{ Tweet: { ID: '4', Text: 'Date range tweet', Username: 'user3', CreatedAt: '2023-01-15' } }],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (advancedSearchCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: 'test query',
        count: 10,  // Default count
        fromDate: '2023-01-01',
        toDate: '2023-01-31',
      }));
      expect(result.content[0].type).toBe('text');
    });

    it('should handle empty advanced search results', async () => {
      // Setup
      let advancedSearchCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_advanced_search') {
          advancedSearchCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(advancedSearchCallback).toBeDefined();
      
      const params = {
        query: 'no results query',
        fromUser: 'nonexistentuser',
      };
      
      const mockResult = {
        id: 'adv-empty',
        data: [],
      };
      
      mockSearchTwitter.mockResolvedValueOnce(mockResult);

      // Execute
      const result = await (advancedSearchCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.objectContaining({
        query: expect.stringContaining('no results query from:nonexistentuser'),
      }));
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No tweets found for advanced query:');
    });

    it('should handle errors during advanced search', async () => {
      // Setup
      let advancedSearchCallback: Function | undefined;
      
      mockTool.mockImplementation((name, schema, callback) => {
        if (name === 'twitter_advanced_search') {
          advancedSearchCallback = callback;
        }
      });
      
      registerTwitterSearchTool(mockServer as any, mockMasaService as any);
      
      // Ensure callback was assigned
      expect(advancedSearchCallback).toBeDefined();
      
      const params = {
        query: 'error query',
      };
      
      const error = new Error('Advanced API error');
      mockSearchTwitter.mockRejectedValueOnce(error);

      // Execute
      const result = await (advancedSearchCallback as Function)(params);

      // Verify
      expect(mockSearchTwitter).toHaveBeenCalledWith(expect.anything());
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error performing advanced Twitter search: Advanced API error');
      expect(result.isError).toBe(true);
    });
  });
});