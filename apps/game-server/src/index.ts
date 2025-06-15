import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { logger } from './utils/logger.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { performanceMonitor } from './utils/PerformanceMonitor.js';
import { databaseService } from './services/DatabaseService.js';
import { GameWebSocketServer } from './networking/WebSocketServer.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Express app setup
const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "ws://localhost:*"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: NODE_ENV === 'production' ? [CORS_ORIGIN] : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring middleware
app.use(performanceMonitor.createMiddleware());

// Rate limiting middleware
app.use(async (req, res, next) => {
  try {
    const key = req.ip || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`
    });
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  const healthStatus = performanceMonitor.getHealthStatus();
  const dbHealthy = true; // databaseService would check this
  
  res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    database: dbHealthy ? 'healthy' : 'unhealthy',
    checks: healthStatus.checks
  });
});

app.get('/metrics', (req, res) => {
  const report = performanceMonitor.getPerformanceReport();
  res.json(report);
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    players: gameWebSocketServer?.getClientCount() || 0,
    rooms: 0, // TODO: Get from room manager
    timestamp: new Date().toISOString()
  });
});

// Initialize multiplayer WebSocket server
let gameWebSocketServer: GameWebSocketServer;

// Server startup
async function startServer() {
  try {
    logger.info('Starting Snake Spell Server...');
    
    // Initialize database
    if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
      await databaseService.initialize();
      logger.info('Database service initialized');
    } else {
      logger.warn('No database URL provided, running without persistence');
    }
    
    // Start performance monitoring
    performanceMonitor.start();
    
    // Start HTTP server
    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`, {
        environment: NODE_ENV,
        port: PORT,
        pid: process.pid,
        cors: CORS_ORIGIN
      });
    });

    // Initialize WebSocket server for multiplayer
    gameWebSocketServer = new GameWebSocketServer(server);
    logger.info('🎮 Multiplayer WebSocket server initialized');
    
    // Setup graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

function gracefulShutdown() {
  logger.info('Received shutdown signal, closing server gracefully...');
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    if (gameWebSocketServer) {
      gameWebSocketServer.close();
      logger.info('WebSocket server closed');
    }
    
    process.exit(0);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// Start the server
startServer(); 