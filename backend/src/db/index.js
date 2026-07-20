/**
 * db/index.js — Drizzle ORM database connection
 * Loads environment variables and creates PostgreSQL client
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client
const client = postgres(connectionString, {
  prepare: false,
});

// Create and export Drizzle instance
export const db = drizzle(client);

// Export client for manual queries if needed
export { client };

// Graceful shutdown
process.on('beforeExit', async () => {
  await client.end();
});
