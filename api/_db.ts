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
    // Disable SSL unless the connection string explicitly requests it.
    // Many hosted Postgres providers (Neon, Supabase, Railway, etc.) use
    // sslmode=require in the URL; plain URLs mean SSL is not available.
    const url = process.env.DATABASE_URL;
    const sslRequired = url.includes('sslmode=require') ||
                        url.includes('sslmode=verify') ||
                        url.includes('ssl=true');
    _pool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: sslRequired ? { rejectUnauthorized: false } : false,
    });
    // Set search_path = streamvault on every new connection
    _pool.on('connect', (client) => {
      client.query("SET search_path = streamvault, public").catch((e) =>
        console.error('[db] search_path error', e.message),
      );
    });
    _pool.on('error', (err) => {
      console.error('[db] pool error', err.message);
      _pool = null;
    });
  }
  return _pool;
}
