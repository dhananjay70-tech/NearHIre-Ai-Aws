/**
 * NearHire.AI — Database Initializer
 * Run with: npm run db:init
 *
 * Reads schema.sql and executes it against the configured PostgreSQL database.
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// ─── Validate required environment variables ──────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('');
  console.error('❌  Missing DATABASE_URL environment variable.');
  console.error('    Open node-backend/.env and set DATABASE_URL to your PostgreSQL connection string.');
  console.error('    Example: DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/nearhire_db');
  console.error('');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const schemaPath = join(__dirname, 'schema.sql');

async function initDatabase() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('');
    console.log('🚀  NearHire.AI — Database Initialization');
    console.log('─────────────────────────────────────────');
    console.log(`📦  Database: ${process.env.DATABASE_URL.split('@')[1] || 'configured database'}`);

    // Read schema SQL
    const schemaSql = readFileSync(schemaPath, 'utf8');
    console.log('📄  Schema file loaded: schema.sql');

    // Execute schema
    const client = await pool.connect();
    try {
      await client.query(schemaSql);
      console.log('✅  Schema executed successfully.');
      console.log('✅  Tables created: users, user_preferences');
      console.log('✅  Indexes created.');
      console.log('✅  Triggers configured.');
      console.log('');
      console.log('🎉  Database initialization complete!');
      console.log('    You can now start the server: npm run dev');
      console.log('');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('');
    console.error('❌  Database initialization failed.');
    console.error('');

    // Beginner-readable error messages
    if (err.code === 'ECONNREFUSED') {
      console.error('    PostgreSQL is not running or the connection was refused.');
      console.error('    Make sure PostgreSQL is running on your machine.');
      console.error('    On Windows: open "Services" and start "postgresql-x64-XX"');
    } else if (err.code === '3D000') {
      console.error('    The database does not exist.');
      console.error(`    Create it first: psql -U postgres -c "CREATE DATABASE nearhire_db;"`);
    } else if (err.code === '28P01' || err.code === '28000') {
      console.error('    Wrong PostgreSQL username or password.');
      console.error('    Check the DATABASE_URL in your .env file.');
    } else if (err.code === '42501') {
      console.error('    Permission denied. Your database user may not have enough privileges.');
    } else {
      console.error(`    Error code: ${err.code || 'unknown'}`);
      console.error(`    Message: ${err.message}`);
    }

    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
