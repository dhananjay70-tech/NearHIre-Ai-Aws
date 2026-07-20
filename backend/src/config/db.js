import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Create a connection pool using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Test the connection at startup
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message);
});

/**
 * Run a single query against the PostgreSQL pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
export const query = (text, params) => pool.query(text, params);

export default pool;
