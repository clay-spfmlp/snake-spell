import { logger, logError } from './logger.js';

export enum ErrorType {
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  GAME_LOGIC_ERROR = 'GAME_LOGIC_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  playerId?: string;
  gameId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  [key: string]: any;
}

export class GameError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    context: ErrorContext = {},
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'GameError';
    this.type = type;
    this.context = context;
    this.isRetryable = isRetryable;
    this.timestamp = Date.now();
  }
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly name: string = 'CircuitBreaker'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
      } else {
        throw new GameError(
          `Circuit breaker ${this.name} is OPEN`,
          ErrorType.NETWORK_ERROR,
          { circuitBreakerState: this.state },
          false
        );
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.reset();
        logger.info(`Circuit breaker ${this.name} reset to CLOSED`);
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`Circuit breaker ${this.name} opened after ${this.failureCount} failures`);
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public getState(): string {
    return this.state;
  }
}

export class RetryManager {
  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt > maxRetries) {
          break;
        }

        // Check if error is retryable
        if (error instanceof GameError && !error.isRetryable) {
          throw error;
        }

        const delay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
        logger.warn(`Operation failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Operation failed with unknown error');
  }
}

export class ErrorHandler {
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  public static getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(5, 60000, name));
    }
    return this.circuitBreakers.get(name)!;
  }

  public static handleError(error: Error, context: ErrorContext = {}): GameError {
    let gameError: GameError;

    if (error instanceof GameError) {
      gameError = error;
    } else {
      // Classify error type
      const errorType = this.classifyError(error);
      const isRetryable = this.isRetryableError(errorType, error);
      
      gameError = new GameError(
        error.message,
        errorType,
        { ...context, originalError: error.name },
        isRetryable
      );
    }

    // Log the error
    logError(gameError, { 
      ...gameError.context,
      errorType: gameError.type,
      isRetryable: gameError.isRetryable
    });

    // Send to monitoring/alerting service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(gameError);
    }

    return gameError;
  }

  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Database errors
    if (name.includes('connection') || message.includes('database') || message.includes('sql')) {
      return ErrorType.DATABASE_ERROR;
    }

    // WebSocket errors
    if (name.includes('websocket') || message.includes('websocket') || message.includes('ws')) {
      return ErrorType.WEBSOCKET_ERROR;
    }

    // Validation errors
    if (name.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION_ERROR;
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT_ERROR;
    }

    // Network errors
    if (name.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  private static isRetryableError(errorType: ErrorType, error: Error): boolean {
    switch (errorType) {
      case ErrorType.DATABASE_ERROR:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.WEBSOCKET_ERROR:
        return true;
      
      case ErrorType.RATE_LIMIT_ERROR:
        return true; // With appropriate delay
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.GAME_LOGIC_ERROR:
        return false;
      
      default:
        // Check if it's a temporary network issue
        return error.message.includes('timeout') || 
               error.message.includes('connection') ||
               error.message.includes('temporary');
    }
  }

  private static sendToMonitoring(error: GameError): void {
    // In production, send to monitoring service like Sentry, DataDog, etc.
    // For now, just log critical errors
    if (!error.isRetryable || error.type === ErrorType.DATABASE_ERROR) {
      logger.error('Critical error detected', {
        errorType: error.type,
        message: error.message,
        context: error.context,
        timestamp: error.timestamp
      });
    }
  }

  public static createDatabaseErrorHandler() {
    const circuitBreaker = this.getCircuitBreaker('database');
    
    return async <T>(operation: () => Promise<T>): Promise<T> => {
      return circuitBreaker.execute(async () => {
        return RetryManager.executeWithRetry(
          operation,
          3, // max retries
          1000, // base delay
          2 // backoff multiplier
        );
      });
    };
  }

  public static createWebSocketErrorHandler() {
    return (error: Error, context: ErrorContext) => {
      const gameError = this.handleError(error, context);
      
      // For WebSocket errors, we might want to trigger reconnection
      if (gameError.type === ErrorType.WEBSOCKET_ERROR && gameError.isRetryable) {
        logger.info('WebSocket error detected, triggering reconnection logic', {
          playerId: context.playerId,
          sessionId: context.sessionId
        });
      }
      
      return gameError;
    };
  }

  public static gracefulShutdown(server: any, websocketServer: any): void {
    const shutdown = () => {
      logger.info('Graceful shutdown initiated...');
      
      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Close all WebSocket connections
      if (websocketServer) {
        websocketServer.clients.forEach((client: any) => {
          client.close(1001, 'Server shutting down');
        });
        
        websocketServer.close(() => {
          logger.info('WebSocket server closed');
        });
      }

      // Close database connections
      // This would be handled by the DatabaseService

      // Exit process
      setTimeout(() => {
        logger.info('Graceful shutdown completed');
        process.exit(0);
      }, 5000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      shutdown();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled promise rejection:', { reason, promise });
      shutdown();
    });
  }
} 