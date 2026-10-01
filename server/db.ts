import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/streamvault',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Ensure all queries resolve against the streamvault schema
pool.on('connect', (client) => {
  client.query("SET search_path = streamvault, public").catch(() => {});
});

export async function initSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure schema exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS streamvault`);
    await client.query(`SET search_path = streamvault, public`);

    // Users / wallets
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL UNIQUE,
        display_name VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
    `);

    // Streams (indexed from onchain events, rebuildable)
    // Source of truth: onchain contract. PG = index + app state.
    await client.query(`
      CREATE TABLE IF NOT EXISTS streams (
        id SERIAL PRIMARY KEY,
        stream_id BIGINT NOT NULL UNIQUE,           -- onchain streamId
        sender_address VARCHAR(42) NOT NULL,
        recipient_address VARCHAR(42) NOT NULL,
        rate_per_second NUMERIC(36,0) NOT NULL,     -- wei units (USDC 6-dec raw)
        deposited_amount NUMERIC(36,0) NOT NULL,
        withdrawn_amount NUMERIC(36,0) NOT NULL DEFAULT 0,
        start_time BIGINT NOT NULL,                 -- unix timestamp
        stop_time BIGINT NOT NULL,                  -- unix timestamp (estimated end)
        label VARCHAR(200),
        category VARCHAR(50) DEFAULT 'payroll',     -- payroll|subscription|retainer|grant
        status VARCHAR(20) NOT NULL DEFAULT 'active', -- active|paused|completed|cancelled
        tx_hash_create VARCHAR(66),
        tx_hash_cancel VARCHAR(66),
        block_number_created BIGINT,
        block_number_updated BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_streams_sender ON streams(sender_address);
      CREATE INDEX IF NOT EXISTS idx_streams_recipient ON streams(recipient_address);
      CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
      CREATE INDEX IF NOT EXISTS idx_streams_stream_id ON streams(stream_id);
    `);

    // Budget envelopes — application layer, not onchain
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_envelopes (
        id SERIAL PRIMARY KEY,
        owner_address VARCHAR(42) NOT NULL,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'payroll',
        limit_amount NUMERIC(36,0) NOT NULL,       -- max total USDC (raw 6-dec)
        period_seconds INT NOT NULL DEFAULT 2592000, -- 30 days
        period_start_ts BIGINT NOT NULL,
        spent_amount NUMERIC(36,0) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_budget_owner ON budget_envelopes(owner_address);
    `);

    // Event log — idempotent by (tx_hash, log_index)
    await client.query(`
      CREATE TABLE IF NOT EXISTS onchain_events (
        id SERIAL PRIMARY KEY,
        tx_hash VARCHAR(66) NOT NULL,
        log_index INT NOT NULL,
        block_number BIGINT NOT NULL,
        event_name VARCHAR(60) NOT NULL,
        stream_id BIGINT,
        payload JSONB,
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tx_hash, log_index)
      );
      CREATE INDEX IF NOT EXISTS idx_events_stream_id ON onchain_events(stream_id);
      CREATE INDEX IF NOT EXISTS idx_events_block ON onchain_events(block_number);
    `);

    // Indexer cursor — resumable, one row
    await client.query(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        id INT PRIMARY KEY DEFAULT 1,
        last_indexed_block BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (id = 1)
      );
      INSERT INTO indexer_state (id, last_indexed_block) VALUES (1, 0)
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[DB] Schema initialised');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
