import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config; 