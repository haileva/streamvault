import { Pool } from 'pg';

// Singleton pool — reused across warm Vercel function invocations
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it in Vercel → Project Settings → Environment Variables.',
    );
  }
  if (!_pool) {
    const isLocal = process.env.DATABASE_URL.includes('localhost') ||
                    process.env.DATABASE_URL.includes('127.0.0.1') ||
                    process.env.DATABASE_URL.includes('sslmode=disable');
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,                    // keep low for serverless cold starts
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
    // surface connection errors immediately instead of hiding them
    _pool.on('error', (err) => {
      console.error('[db] pool error', err.message);
      _pool = null; // reset so next call re-creates
    });
  }
  return _pool;
}
