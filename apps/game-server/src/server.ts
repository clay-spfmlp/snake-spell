import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { GameWebSocketServer } from './networking/WebSocketServer.js';
import { startMemoryMonitor, startPeriodicOptimization, getMemoryUsage, runGarbageCollection } from './utils/memoryOptimizer.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Start WebSocket server
const wsServer = new GameWebSocketServer(server);

// Memory monitoring and optimization
const memoryMonitorInterval = startMemoryMonitor();
const optimizationInterval = startPeriodicOptimization();

// Basic health check endpoint
app.get('/health', (req, res) => {
  const memory = getMemoryUsage();
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connectedPlayers: wsServer.getClientCount(),
    memory: {
      used: `${memory.used}MB`,
      total: `${memory.total}MB`,
      percentage: `${memory.percentage}%`
    }
  });
});

// Force memory cleanup endpoint (for testing)
app.post('/cleanup', (req, res) => {
  wsServer.cleanup();
  runGarbageCollection();
  
  const memoryBefore = getMemoryUsage();
  res.json({
    status: 'ok',
    message: 'Cleanup completed',
    memory: {
      used: `${memoryBefore.used}MB`,
      total: `${memoryBefore.total}MB`,
      percentage: `${memoryBefore.percentage}%`
    }
  });
});

// API routes
app.get('/api/players', (req, res) => {
  res.json(wsServer.getConnectedPlayers());
});

// Start HTTP server
server.listen(PORT, () => {
  console.log(`🌐 HTTP server running on port ${PORT}`);
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down servers...');
  clearInterval(memoryMonitorInterval);
  clearInterval(optimizationInterval);
  wsServer.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down servers...');
  clearInterval(memoryMonitorInterval);
  clearInterval(optimizationInterval);
  wsServer.close();
  server.close();
  process.exit(0);
}); 