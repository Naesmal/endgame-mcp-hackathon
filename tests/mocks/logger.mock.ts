// Mock logger implementation
import { jest } from '@jest/globals';

const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  
  export default logger;