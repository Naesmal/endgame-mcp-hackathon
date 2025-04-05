import { 
    generateId, 
    delay, 
    truncateText, 
    objectToURLParams, 
    safeJsonParse 
  } from '../../src/utils/helpers';
  
  // Mock crypto for generateId
  jest.mock('crypto', () => ({
    createHash: jest.fn(() => ({
      update: jest.fn(() => ({
        digest: jest.fn(() => ({
          substring: jest.fn(() => 'mockedHash123456')
        }))
      }))
    }))
  }));
  
  describe('Utility Helpers', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.spyOn(global.Math, 'random').mockReturnValue(0.123456789);
      jest.spyOn(Date, 'now').mockReturnValue(1609459200000); // 2021-01-01
    });
  
    afterEach(() => {
      jest.spyOn(global.Math, 'random').mockRestore();
      jest.spyOn(Date, 'now').mockRestore();
    });
  
    describe('generateId', () => {
      it('should generate ID with prefix and timestamp without data', () => {
        const id = generateId('test');
        // Based on our mocks: prefix_timestamp_randomValue
        expect(id).toBe('test_200000_123456');
      });
  
      it('should generate ID with hash when data is provided', () => {
        const data = { key: 'value' };
        const id = generateId('test', data);
        expect(id).toBe('test_mockedHash123456');
      });
    });
  
    describe('delay', () => {
      it('should resolve after the specified delay', async () => {
        // Mock setTimeout
        jest.useFakeTimers();
        const spy = jest.spyOn(global, 'setTimeout');
        
        const promise = delay(1000);
        
        // Verify setTimeout was called with 1000ms
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 1000);
        
        // Fast-forward time
        jest.runAllTimers();
        
        await promise; // This should resolve now
        
        // Clean up
        jest.useRealTimers();
        spy.mockRestore();
      });
    });
  
    describe('truncateText', () => {
      it('should not truncate text shorter than maxLength', () => {
        const text = 'Short text';
        const result = truncateText(text, 20);
        expect(result).toBe(text);
      });
  
      it('should truncate text longer than maxLength', () => {
        const text = 'This is a long text that should be truncated';
        const result = truncateText(text, 15);
        expect(result).toBe('This is a long...');
      });
  
      it('should use custom suffix when provided', () => {
        const text = 'This is a long text that should be truncated';
        const result = truncateText(text, 15, ' [more]');
        expect(result).toBe('This is a lon [more]');
      });
    });
  
    describe('objectToURLParams', () => {
      it('should convert an object to URL parameters', () => {
        const params = {
          query: 'test',
          limit: 10,
          offset: 5
        };
        
        const result = objectToURLParams(params);
        expect(result).toBe('query=test&limit=10&offset=5');
      });
  
      it('should skip null and undefined values', () => {
        const params = {
          query: 'test',
          limit: null,
          offset: undefined,
          valid: 0
        };
        
        const result = objectToURLParams(params);
        expect(result).toBe('query=test&valid=0');
      });
  
      it('should handle empty object', () => {
        const result = objectToURLParams({});
        expect(result).toBe('');
      });
    });
  
    describe('safeJsonParse', () => {
      it('should parse valid JSON string', () => {
        const jsonString = '{"name":"Test","value":123}';
        const result = safeJsonParse(jsonString, null);
        expect(result).toEqual({ name: 'Test', value: 123 });
      });
  
      it('should return default value for invalid JSON', () => {
        const invalidJson = '{name:"Invalid"}';
        const defaultValue = { name: 'Default' };
        const result = safeJsonParse(invalidJson, defaultValue);
        expect(result).toEqual(defaultValue);
      });
    });
  });