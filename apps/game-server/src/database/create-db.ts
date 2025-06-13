import { Client } from 'pg';

async function createDatabase() {
  // Connect to postgres database first (default database)
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres' // Connect to default postgres database
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'snake_word_arena'"
    );
    
    if (result.rows.length === 0) {
      // Create the database
      await client.query('CREATE DATABASE snake_word_arena');
      console.log('Database "snake_word_arena" created successfully!');
    } else {
      console.log('Database "snake_word_arena" already exists.');
    }
    
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await client.end();
  }
}

createDatabase(); 