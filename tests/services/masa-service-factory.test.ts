import { MasaServiceFactory } from '../../src/services/masa-service';
import { MasaApiService } from '../../src/services/masa-api';
import { MasaProtocolService } from '../../src/services/masa-protocol';

// Mock the imports
jest.mock('../../src/services/masa-api', () => ({
  MasaApiService: jest.fn().mockImplementation(() => ({
    type: 'api-service'
  }))
}));

jest.mock('../../src/services/masa-protocol', () => ({
  MasaProtocolService: jest.fn().mockImplementation(() => ({
    type: 'protocol-service'
  }))
}));

describe('MasaServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createService', () => {
    it('should create MasaApiService when mode is API', async () => {
      // Execute
      const service = await MasaServiceFactory.createService('API');

      // Verify
      expect(MasaApiService).toHaveBeenCalled();
      expect(service).toEqual({ type: 'api-service' });
    });

    it('should create MasaProtocolService when mode is PROTOCOL', async () => {
      // Execute
      const service = await MasaServiceFactory.createService('PROTOCOL');

      // Verify
      expect(MasaProtocolService).toHaveBeenCalled();
      expect(service).toEqual({ type: 'protocol-service' });
    });
  });
});