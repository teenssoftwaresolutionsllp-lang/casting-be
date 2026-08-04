import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is missing.');
  process.exit(1);
}

async function run() {
  console.log('Connecting to database...');
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('Connection established. Running Drizzle migrations...');
    
    const db = drizzle(client);
    
    // Run the migrations against the database
    await migrate(db, { 
      migrationsFolder: path.join(__dirname, 'migrations') 
    });
    
    console.log('Database migrated successfully!');
  } catch (err) {
    console.error('Database migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
