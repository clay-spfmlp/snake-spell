import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { logger } from '../utils/logger.js';

async function runMigrations() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is required');
    }

    logger.info('Starting database migrations...');
    
    const sql = neon(DATABASE_URL);
    const db = drizzle(sql as any) as any;

    await migrate(db, { migrationsFolder: './drizzle' });
    
    logger.info('Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 