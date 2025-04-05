import { BittensorServiceFactory, BittensorService } from '../../src/services/bittensor-service';
import { env, isBittensorEnabled } from '../../src/config/env';

// Mock the isBittensorEnabled function and BittensorApiService
jest.mock('../../src/config/env', () => ({
  env: {
    TAO_STAT_API_KEY: 'mock-key',
  },
  isBittensorEnabled: jest.fn(),
}));

// Mock the BittensorApiService import
jest.mock('../../src/services/bittensor-api', () => ({
  BittensorApiService: jest.fn().mockImplementation(() => ({
    type: 'api-service',
    getSubnetInfo: jest.fn(),
  })),
}));

describe('BittensorServiceFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createService', () => {
    it('should create BittensorApiService when Bittensor is enabled', async () => {
      // Setup
      (isBittensorEnabled as jest.Mock).mockReturnValue(true);
      const { BittensorApiService } = await import('../../src/services/bittensor-api');

      // Execute
      const service = await BittensorServiceFactory.createService();

      // Verify
      expect(isBittensorEnabled).toHaveBeenCalled();
      expect(BittensorApiService).toHaveBeenCalled();
      expect(service).toEqual({ type: 'api-service', getSubnetInfo: expect.any(Function) });
    });

    it('should create BittensorDisabledService when Bittensor is disabled', async () => {
      // Setup
      (isBittensorEnabled as jest.Mock).mockReturnValue(false);

      // Execute
      const service = await BittensorServiceFactory.createService();

      // Verify
      expect(isBittensorEnabled).toHaveBeenCalled();
      expect(service.getSubnetInfo).toBeDefined();
      
      // All methods should throw error in the disabled service
      await expect(service.getSubnetInfo()).rejects.toThrow(
        'Bittensor functionality is disabled'
      );
    });

    it('should create BittensorDisabledService when TAO_STAT_API_KEY is missing', async () => {
      // Setup
      (isBittensorEnabled as jest.Mock).mockReturnValue(true);
      // Override env to simulate missing key
      jest.replaceProperty(env, 'TAO_STAT_API_KEY', '');

      // Execute
      const service = await BittensorServiceFactory.createService();

      // Verify
      expect(service.getSubnetInfo).toBeDefined();
      
      // All methods should throw error in the disabled service
      await expect(service.getSubnetInfo()).rejects.toThrow(
        'Bittensor functionality is disabled'
      );
    });
  });
});