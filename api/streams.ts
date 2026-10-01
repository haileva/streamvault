import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const pool = getPool();

  // ── GET /api/streams?address=&role=&status=&category=&limit=&offset= ──
  if (req.method === 'GET' && !req.query.streamId) {
    const { address, role, status, category, limit = '50', offset = '0' } =
      req.query as Record<string, string>;
    if (!address) return res.status(400).json({ error: 'address required' });

    const conditions: string[] = [];
    const params: unknown[] = [address.toLowerCase()];

    if (role === 'sender') conditions.push('sender_address = $1');
    else if (role === 'recipient') conditions.push('recipient_address = $1');
    else conditions.push('(sender_address = $1 OR recipient_address = $1)');

    if (status)   { params.push(status);   conditions.push(`status = $${params.length}`);   }
    if (category) { params.push(category); conditions.push(`category = $${params.length}`); }

    const lim = Math.min(Number(limit), 200);
    const off = Math.max(Number(offset), 0);
    params.push(lim);
    params.push(off);

    try {
      const { rows } = await pool.query(
        `SELECT * FROM streams WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      const countParams = params.slice(0, -2);
      const { rows: cr } = await pool.query(
        `SELECT COUNT(*) FROM streams WHERE ${conditions.join(' AND ')}`,
        countParams,
      );
      return res.json({ streams: rows, total: parseInt(cr[0].count) });
    } catch (e) {
      console.error('[streams GET]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── GET /api/streams?streamId=123 ──
  if (req.method === 'GET' && req.query.streamId) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM streams WHERE stream_id = $1',
        [req.query.streamId],
      );
      if (!rows[0]) return res.status(404).json({ error: 'not found' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('[streams GET/:id]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── POST /api/streams ──
  if (req.method === 'POST') {
    const {
      stream_id, sender_address, recipient_address, rate_per_second,
      deposited_amount, start_time, stop_time, label, category,
      tx_hash_create, block_number_created,
    } = req.body ?? {};

    if (!stream_id || !sender_address || !recipient_address || !rate_per_second || !deposited_amount)
      return res.status(400).json({ error: 'missing required fields' });

    try {
      const { rows } = await pool.query(
        `INSERT INTO streams
          (stream_id, sender_address, recipient_address, rate_per_second, deposited_amount,
           start_time, stop_time, label, category, tx_hash_create, block_number_created)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (stream_id) DO UPDATE SET
           label = EXCLUDED.label, category = EXCLUDED.category, updated_at = NOW()
         RETURNING *`,
        [
          stream_id,
          sender_address.toLowerCase(),
          recipient_address.toLowerCase(),
          rate_per_second,
          deposited_amount,
          start_time,
          stop_time,
          label ?? null,
          category ?? 'payroll',
          tx_hash_create ?? null,
          block_number_created ?? null,
        ],
      );
      return res.status(201).json(rows[0]);
    } catch (e) {
      console.error('[streams POST]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── PATCH /api/streams?streamId=123 ──
  if (req.method === 'PATCH') {
    const streamId = req.query.streamId as string;
    if (!streamId) return res.status(400).json({ error: 'streamId required' });

    const { status, withdrawn_amount, tx_hash_cancel, block_number_updated } = req.body ?? {};
    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];

    if (status)                     { params.push(status);             sets.push(`status = $${params.length}`);             }
    if (withdrawn_amount !== undefined) { params.push(withdrawn_amount); sets.push(`withdrawn_amount = $${params.length}`); }
    if (tx_hash_cancel)             { params.push(tx_hash_cancel);     sets.push(`tx_hash_cancel = $${params.length}`);     }
    if (block_number_updated)       { params.push(block_number_updated); sets.push(`block_number_updated = $${params.length}`); }

    if (sets.length === 1) return res.status(400).json({ error: 'nothing to update' });
    params.push(streamId);

    try {
      const { rows } = await pool.query(
        `UPDATE streams SET ${sets.join(', ')} WHERE stream_id = $${params.length} RETURNING *`,
        params,
      );
      if (!rows[0]) return res.status(404).json({ error: 'not found' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('[streams PATCH]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
