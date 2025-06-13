import winston from 'winston';

// Determine log level based on environment
const getLogLevel = (): string => {
  if (process.env.NODE_ENV === 'test') return 'error';
  if (process.env.NODE_ENV === 'production') return 'info';
  return 'debug';
};

// Create Winston logger instance
export const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'snake-word-arena-server',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 10
  }));
}

// Performance logging helpers
export const logPerformance = (operation: string, startTime: number): void => {
  const duration = Date.now() - startTime;
  
  if (duration > 1000) {
    logger.warn(`Slow operation detected: ${operation}`, { duration: `${duration}ms` });
  } else if (duration > 100) {
    logger.info(`Operation completed: ${operation}`, { duration: `${duration}ms` });
  } else {
    logger.debug(`Operation completed: ${operation}`, { duration: `${duration}ms` });
  }
};

// Error logging with context
export const logError = (error: Error, context?: Record<string, any>): void => {
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context
  });
};

// Game event logging
export const logGameEvent = (event: string, gameId?: string, playerId?: string, data?: any): void => {
  logger.info(`Game event: ${event}`, {
    gameId,
    playerId,
    data,
    timestamp: new Date().toISOString()
  });
};

// Connection logging
export const logConnection = (event: 'connect' | 'disconnect', playerId: string, ip?: string): void => {
  logger.info(`Player ${event}`, {
    playerId,
    ip,
    timestamp: new Date().toISOString()
  });
};

// Export default logger
export default logger; 