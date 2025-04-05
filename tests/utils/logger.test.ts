import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { env } from '../../src/config/env';

// Mock imports
jest.mock('winston', () => {
  const formatFns = {
    timestamp: jest.fn().mockReturnValue('timestamp-format'),
    errors: jest.fn().mockReturnValue('errors-format'),
    printf: jest.fn().mockReturnValue('custom-format'),
    combine: jest.fn().mockReturnValue('combined-format')
  };
  
  return {
    format: formatFns,
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }),
    transports: {
      File: jest.fn().mockImplementation(options => ({
        type: 'file-transport',
        ...options
      })),
      Console: jest.fn().mockImplementation(options => ({
        type: 'console-transport',
        ...options
      }))
    }
  };
});

jest.mock('../../src/config/env', () => ({
  env: {
    LOG_LEVEL: 'info'
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
  resolve: jest.fn().mockImplementation((...args) => args.join('/'))
}));

describe('Logger', () => {
  let mockCwd: jest.SpyInstance;
  
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock process.cwd
    mockCwd = jest.spyOn(process, 'cwd').mockReturnValue('/app');
    
    // Reset mock response for existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });
  
  afterEach(() => {
    mockCwd.mockRestore();
  });

  it('should create log directory if it does not exist', () => {
    // Setup
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Execute - import the logger which triggers the initialization
    require('../../src/utils/logger');
    
    // Verify
    expect(path.join).toHaveBeenCalledWith('/app', 'logs');
    expect(fs.existsSync).toHaveBeenCalledWith('/app/logs');
    expect(fs.mkdirSync).toHaveBeenCalledWith('/app/logs', { recursive: true });
  });
  
  it('should not create log directory if it already exists', () => {
    // Setup
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    
    // Execute - import the logger which triggers the initialization
    require('../../src/utils/logger');
    
    // Verify
    expect(fs.existsSync).toHaveBeenCalledWith('/app/logs');
    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });
  
  it('should configure proper timestamp format', () => {
    // Execute - import the logger which triggers the initialization
    require('../../src/utils/logger');
    
    // Verify
    expect(winston.format.timestamp).toHaveBeenCalledWith({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    });
  });
  
  it('should create a custom format function', () => {
    // Execute - import the logger which triggers the initialization
    require('../../src/utils/logger');
    
    // Verify
    expect(winston.format.printf).toHaveBeenCalled();
    
    // Get the format function
    const formatFn = (winston.format.printf as jest.Mock).mock.calls[0][0];
    
    // Test the format function
    const formattedLog = formatFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00'
    });
    
    expect(formattedLog).toBe('2023-01-01 12:00:00 [MCP] [info] Test message');
    
    // Test with context
    const formattedLogWithContext = formatFn({
      level: 'info',
      message: 'Test message',
      timestamp: '2023-01-01 12:00:00',
      context: 'TestContext'
    });
    
    expect(formattedLogWithContext).toBe('2023-01-01 12:00:00 [MCP] [info] [TestContext] Test message');
    
    // Test with stack
    const formattedLogWithStack = formatFn({
      level: 'error',
      message: 'Error message',
      timestamp: '2023-01-01 12:00:00',
      stack: 'Error stack trace'
    });
    
    expect(formattedLogWithStack).toBe('2023-01-01 12:00:00 [MCP] [error] Error message\nError stack trace');
  });
  
  it('should create a logger with proper configuration', () => {
    // Execute - import the logger which triggers the initialization
    require('../../src/utils/logger');
    
    // Verify
    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'info',
      format: 'combined-format',
      defaultMeta: { service: 'masa-mcp' },
      transports: expect.arrayContaining([
        expect.objectContaining({
          type: 'file-transport',
          filename: '/app/logs/error.log',
          level: 'error'
        }),
        expect.objectContaining({
          type: 'file-transport',
          filename: '/app/logs/combined.log'
        }),
        expect.objectContaining({
          type: 'console-transport',
          stderrLevels: ['error', 'warn', 'info', 'verbose', 'debug', 'silly']
        })
      ])
    });
  });
  
  it('should use LOG_LEVEL from environment', () => {
    // Setup
    (env.LOG_LEVEL as any) = 'debug';
    
    // Execute - import the logger which triggers the initialization
    jest.resetModules();
    require('../../src/utils/logger');
    
    // Verify
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug'
      })
    );
  });
  
  it('should default to info level if LOG_LEVEL is not provided', () => {
    // Setup
    delete (env as any).LOG_LEVEL;
    
    // Execute - import the logger which triggers the initialization
    jest.resetModules();
    require('../../src/utils/logger');
    
    // Verify
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info'
      })
    );
  });
  
  it('should export the logger with all required methods', () => {
    // Execute - import the logger
    const logger = require('../../src/utils/logger').default;
    
    // Verify
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });
});