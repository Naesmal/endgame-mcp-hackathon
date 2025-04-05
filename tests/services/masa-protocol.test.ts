import axios from 'axios';
import { MasaProtocolService } from '../../src/services/masa-protocol';
import { TwitterSearchRequest } from '../../src/types';

// Mock axios and generateId
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

jest.mock('../../src/utils/helpers', () => ({
  generateId: jest.fn(() => 'mocked-id'),
  // Include other exports if needed
  delay: jest.fn((ms) => Promise.resolve()),
  truncateText: jest.fn((text, maxLength, suffix) => text),
  objectToURLParams: jest.fn((params) => ''),
  safeJsonParse: jest.fn((jsonString, defaultValue) => defaultValue),
}));

describe('MasaProtocolService', () => {
  let masaProtocolService: MasaProtocolService;
  let axiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    masaProtocolService = new MasaProtocolService();
    axiosInstance = (axios.create as jest.Mock).mock.results[0].value;
  });

  describe('searchTwitter', () => {
    it('should call the Twitter search endpoint with protocol format and return results', async () => {
      // Setup
      const request: TwitterSearchRequest = {
        query: 'test query',
        count: 5,
      };
      
      const mockResponse = {
        data: {
          data: [{ Tweet: { ID: '1', Text: 'Protocol test tweet' } }],
          workerPeerId: 'worker123',
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaProtocolService.searchTwitter(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/data/twitter/tweets/recent', {
        query: 'test query',
        count: 5,
      });
      
      expect(result).toEqual({
        id: 'mocked-id',
        data: [{ Tweet: { ID: '1', Text: 'Protocol test tweet' } }],
        workerPeerId: 'worker123',
      });
    });

    it('should handle errors when searching Twitter', async () => {
      // Setup
      const request: TwitterSearchRequest = {
        query: 'test query',
      };
      
      const error = new Error('Protocol network error');
      axiosInstance.post.mockRejectedValueOnce(error);

      // Execute & Verify
      await expect(masaProtocolService.searchTwitter(request)).rejects.toThrow(error);
    });
  });

  describe('indexData', () => {
    it('should call the data index endpoint with correct namespace', async () => {
      // Setup
      const request = {
        data: { key: 'value' },
        metadata: { metaKey: 'metaValue' },
        namespace: 'twitter',
      };
      
      const mockResponse = {
        data: {
          id: 'index-protocol-123',
          success: true,
          message: 'Data indexed successfully',
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaProtocolService.indexData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/data/index', {
        data: { key: 'value' },
        metadata: { metaKey: 'metaValue' },
        namespace: 'twitter',
      });
      
      expect(result).toEqual({
        id: 'index-protocol-123',
        status: 'success',
        message: 'Data indexed successfully',
      });
    });

    it('should normalize namespace to bittensor when specified', async () => {
      // Setup
      const request = {
        data: { key: 'value' },
        namespace: 'bittensor',
      };
      
      const mockResponse = {
        data: {
          id: 'index-protocol-456',
          success: true,
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      await masaProtocolService.indexData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/data/index', {
        data: { key: 'value' },
        namespace: 'bittensor',
      });
    });
  });

  describe('getTwitterSearchResults', () => {
    it('should return error for protocol not supporting past search results', async () => {
      // Execute
      const result = await masaProtocolService.getTwitterSearchResults('test-id');

      // Verify
      expect(result).toEqual({
        id: 'test-id',
        error: 'Protocol does not support retrieving past search results. Please perform a new search.',
      });
    });
  });

  describe('checkTwitterSearchStatus', () => {
    it('should simulate completed status for protocol searches', async () => {
      // Execute
      const result = await masaProtocolService.checkTwitterSearchStatus('test-id');

      // Verify
      expect(result).toEqual({
        status: 'completed',
        message: 'Protocol searches are processed synchronously',
      });
    });
  });

  describe('queryData', () => {
    it('should call the data query endpoint with correct parameters', async () => {
      // Setup
      const request = {
        query: 'protocol test query',
        namespace: 'twitter',
        limit: 15,
        offset: 5,
      };
      
      const mockResponse = {
        data: {
          results: [{ id: 1, content: 'protocol result' }],
          total: 50,
          hasMore: true,
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaProtocolService.queryData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/v1/data/query', {
        query: 'protocol test query',
        namespace: 'twitter',
        limit: 15,
        offset: 5,
      });
      
      expect(result).toEqual({
        data: [{ id: 1, content: 'protocol result' }],
        total: 50,
        hasMore: true,
      });
    });
  });
});