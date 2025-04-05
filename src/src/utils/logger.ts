import winston from 'winston';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path';

// S'assurer que le répertoire des logs existe
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Format de timestamp
const timestamp = winston.format.timestamp({
  format: 'YYYY-MM-DD HH:mm:ss.SSS'
});

// Format personnalisé pour les logs
const customFormat = winston.format.printf(({ level, message, timestamp, context, stack }) => {
  const contextStr = context ? `[${context}] ` : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `${timestamp} [MCP] [${level}] ${contextStr}${message}${stackStr}`;
});

// Créer le logger
const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    timestamp,
    winston.format.errors({ stack: true }),
    customFormat
  ),
  defaultMeta: { service: 'masa-mcp' },
  transports: [
    // Écrire dans le fichier de log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log')
    }),
    // Écrire seulement sur stderr (et non pas sur stdout) pour ne pas interférer avec la communication JSON
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'verbose', 'debug', 'silly'],
    })
  ],
});

export default logger;