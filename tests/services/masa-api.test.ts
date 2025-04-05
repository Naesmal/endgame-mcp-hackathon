import axios from 'axios';
import { MasaApiService } from '../../src/services/masa-api';
import { TwitterSearchRequest, DataIndexRequest, DataQueryRequest } from '../../src/types';
import { API_ENDPOINTS } from '../../src/constants/endpoints';

// Mock axios
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

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MasaApiService', () => {
  let masaApiService: MasaApiService;
  let axiosInstance: any;
  let requestInterceptor: Function;
  let responseSuccessInterceptor: Function;
  let responseErrorInterceptor: Function;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new instance of the service
    masaApiService = new MasaApiService();
    
    // Get the axios instance created by the service
    axiosInstance = (axios.create as jest.Mock).mock.results[0].value;
    
    // Capture the interceptors for testing
    requestInterceptor = axiosInstance.interceptors.request.use.mock.calls[0][0];
    responseSuccessInterceptor = axiosInstance.interceptors.response.use.mock.calls[0][0];
    responseErrorInterceptor = axiosInstance.interceptors.response.use.mock.calls[0][1];
  });

  describe('constructor', () => {
    it('should configure axios instance with correct settings', () => {
      // Verify
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: expect.any(String),
        headers: {
          'Authorization': expect.stringContaining('Bearer'),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      expect(axiosInstance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axiosInstance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('should have request interceptor that logs requests', () => {
      // Setup a mock request
      const mockRequest = {
        method: 'post',
        baseURL: 'https://api.example.com',
        url: '/endpoint'
      };
      
      // Execute the interceptor
      const result = requestInterceptor(mockRequest);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;
      
      // Verify
      expect(logger.debug).toHaveBeenCalledWith('API Request: POST https://api.example.com/endpoint');
      expect(result).toBe(mockRequest);
    });

    it('should have response success interceptor that logs responses', () => {
      // Setup a mock response
      const mockResponse = {
        status: 200,
        statusText: 'OK'
      };
      
      // Execute the interceptor
      const result = responseSuccessInterceptor(mockResponse);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;
      
      // Verify
      expect(logger.debug).toHaveBeenCalledWith('API Response: 200 OK');
      expect(result).toBe(mockResponse);
    });

    it('should have response error interceptor that handles errors with response', () => {
      // Setup a mock error with response
      const mockError = {
        response: {
          status: 404,
          statusText: 'Not Found'
        },
        message: 'Request failed with status code 404'
      };
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;
      
      // Execute & Verify
      expect(() => responseErrorInterceptor(mockError)).rejects.toThrow('Request failed: Request failed with status code 404');
      expect(logger.error).toHaveBeenCalledWith('API Error: 404 Not Found');
      expect(logger.debug).toHaveBeenCalledWith('API Error Message: Request failed with status code 404');
    });

    it('should have response error interceptor that handles errors without response', () => {
      // Setup a mock error without response
      const mockError = {
        message: 'Network Error'
      };
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;
      
      // Execute & Verify
      expect(() => responseErrorInterceptor(mockError)).rejects.toThrow('Request failed: Network Error');
      expect(logger.error).toHaveBeenCalledWith('API Request Failed: Network Error');
    });
  });

  describe('searchTwitter', () => {
    it('should call the Twitter search endpoint and return results', async () => {
      // Setup
      const request: TwitterSearchRequest = {
        query: 'test query',
        count: 10,
      };
      
      const mockResponse = {
        data: {
          id: 'search123',
          data: [{ Tweet: { ID: '1', Text: 'Test tweet' } }],
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.searchTwitter(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.TWITTER.SEARCH, request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when searching Twitter', async () => {
      // Setup
      const request: TwitterSearchRequest = {
        query: 'test query',
      };
      
      const error = new Error('Network error');
      axiosInstance.post.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.searchTwitter(request)).rejects.toThrow(error);
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.TWITTER.SEARCH, request);
      expect(logger.error).toHaveBeenCalledWith('Error searching Twitter:', error);
    });
  });

  describe('checkTwitterSearchStatus', () => {
    it('should call the status endpoint with job ID and return status', async () => {
      // Setup
      const jobId = 'job123';
      const mockResponse = {
        data: {
          status: 'completed',
          message: 'Search completed successfully'
        }
      };
      
      axiosInstance.get.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.checkTwitterSearchStatus(jobId);

      // Verify
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.TWITTER.STATUS}/${jobId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when checking Twitter search status', async () => {
      // Setup
      const jobId = 'job123';
      const error = new Error('Not found');
      
      axiosInstance.get.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.checkTwitterSearchStatus(jobId)).rejects.toThrow(error);
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.TWITTER.STATUS}/${jobId}`);
      expect(logger.error).toHaveBeenCalledWith(`Error checking Twitter search status for job ${jobId}:`, error);
    });
  });

  describe('getTwitterSearchResults', () => {
    it('should call the results endpoint with job ID and return results', async () => {
      // Setup
      const jobId = 'job123';
      const mockResponse = {
        data: {
          id: jobId,
          data: [{ Tweet: { ID: '1', Text: 'Result tweet' } }]
        }
      };
      
      axiosInstance.get.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.getTwitterSearchResults(jobId);

      // Verify
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.TWITTER.RESULT}/${jobId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when getting Twitter search results', async () => {
      // Setup
      const jobId = 'job123';
      const error = new Error('Results not available');
      
      axiosInstance.get.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.getTwitterSearchResults(jobId)).rejects.toThrow(error);
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.TWITTER.RESULT}/${jobId}`);
      expect(logger.error).toHaveBeenCalledWith(`Error getting Twitter search results for job ${jobId}:`, error);
    });
  });

  describe('indexData', () => {
    it('should call the data index endpoint with correct namespace', async () => {
      // Setup
      const request: DataIndexRequest = {
        data: { key: 'value' },
        metadata: { metaKey: 'metaValue' },
        namespace: 'twitter',
      };
      
      const mockResponse = {
        data: {
          id: 'index123',
          status: 'success',
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.indexData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.INDEX, request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should use bittensor namespace when explicitly specified', async () => {
      // Setup
      const request: DataIndexRequest = {
        data: { key: 'value' },
        namespace: 'bittensor',
      };
      
      const mockResponse = {
        data: {
          id: 'index123',
          status: 'success',
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.indexData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.INDEX, {
        ...request,
        namespace: 'bittensor',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should normalize namespace to twitter if invalid', async () => {
      // Setup
      const request: DataIndexRequest = {
        data: { key: 'value' },
        namespace: 'invalid-namespace',
      };
      
      const mockResponse = {
        data: {
          id: 'index123',
          status: 'success',
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute
      const result = await masaApiService.indexData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.INDEX, {
        ...request,
        namespace: 'twitter',
      });
      expect(logger.warn).toHaveBeenCalledWith(`Namespace override: requested 'invalid-namespace' but using 'twitter' for indexing`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when indexing data', async () => {
      // Setup
      const request: DataIndexRequest = {
        data: { key: 'value' },
      };
      
      const error = new Error('Indexing error');
      axiosInstance.post.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.indexData(request)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith('Error indexing data:', error);
    });
  });

  describe('queryData', () => {
    it('should call the data query endpoint with correct parameters', async () => {
      // Setup
      const request: DataQueryRequest = {
        query: 'test query',
        namespace: 'bittensor',
        limit: 20,
        offset: 10,
      };
      
      const mockResponse = {
        data: {
          data: [{ id: 1, content: 'result' }],
          total: 100,
          hasMore: true,
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.queryData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.QUERY, request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should use twitter namespace by default if not specified', async () => {
      // Setup
      const request: DataQueryRequest = {
        query: 'test query',
        // No namespace
      };
      
      const mockResponse = {
        data: {
          data: [{ id: 1, content: 'result' }],
          total: 1,
          hasMore: false,
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.queryData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.QUERY, {
        ...request,
        namespace: 'twitter',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should normalize namespace to twitter if invalid', async () => {
      // Setup
      const request: DataQueryRequest = {
        query: 'test query',
        namespace: 'invalid-namespace',
      };
      
      const mockResponse = {
        data: {
          data: [{ id: 1, content: 'result' }],
          total: 1,
          hasMore: false,
        },
      };
      
      axiosInstance.post.mockResolvedValueOnce(mockResponse);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute
      const result = await masaApiService.queryData(request);

      // Verify
      expect(axiosInstance.post).toHaveBeenCalledWith(API_ENDPOINTS.DATA.QUERY, {
        ...request,
        namespace: 'twitter',
      });
      expect(logger.warn).toHaveBeenCalledWith(`Namespace override: requested 'invalid-namespace' but using 'twitter' for querying`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when querying data', async () => {
      // Setup
      const request: DataQueryRequest = {
        query: 'test query',
      };
      
      const error = new Error('Query error');
      axiosInstance.post.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.queryData(request)).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith('Error querying data:', error);
    });
  });

  describe('checkDataIndexStatus', () => {
    it('should call the data index status endpoint with job ID and return status', async () => {
      // Setup
      const jobId = 'index123';
      const mockResponse = {
        data: {
          status: 'completed',
          message: 'Indexing completed successfully'
        }
      };
      
      axiosInstance.get.mockResolvedValueOnce(mockResponse);

      // Execute
      const result = await masaApiService.checkDataIndexStatus(jobId);

      // Verify
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.DATA.STATUS}/${jobId}`);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle errors when checking data index status', async () => {
      // Setup
      const jobId = 'index123';
      const error = new Error('Status not available');
      
      axiosInstance.get.mockRejectedValueOnce(error);
      
      // Get the logger
      const logger = require('../../src/utils/logger').default;

      // Execute & Verify
      await expect(masaApiService.checkDataIndexStatus(jobId)).rejects.toThrow(error);
      expect(axiosInstance.get).toHaveBeenCalledWith(`${API_ENDPOINTS.DATA.STATUS}/${jobId}`);
      expect(logger.error).toHaveBeenCalledWith(`Error checking data index status for job ${jobId}:`, error);
    });
  });
});