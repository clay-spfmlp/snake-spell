import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';
import { logger } from '../utils/logger.js';

// Get database URL from environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is required');
}

// Create Neon client
const sql = neon(DATABASE_URL);

// Create Drizzle instance with schema
export const db = drizzle(sql as any, { schema });

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    logger.info('Database connection healthy');
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database connection...');
    
    // Test connection
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    logger.info('Closing database connection...');
    // Neon serverless doesn't require explicit connection closing
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
} 