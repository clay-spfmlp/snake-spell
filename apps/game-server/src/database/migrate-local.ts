import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import { logger } from '../utils/logger.js';

async function runMigrations() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL or NEON_DATABASE_URL environment variable is required');
    }

    logger.info('Starting database migrations...');
    
    const client = new Client({
      connectionString: DATABASE_URL,
    });
    await client.connect();
    const db = drizzle(client);

    await migrate(db, { migrationsFolder: './drizzle' });
    
    logger.info('Database migrations completed successfully');
    await client.end();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations(); 