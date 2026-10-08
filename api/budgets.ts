import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let pool;
  try { pool = getPool(); } catch (e) {
    return res.status(503).json({ error: 'database not configured', detail: (e as Error).message });
  }

  // ── GET /api/budgets?owner=0x... ──
  if (req.method === 'GET') {
    const { owner } = req.query as Record<string, string>;
    if (!owner) return res.status(400).json({ error: 'owner required' });
    const addrRegexGet = /^0x[0-9a-fA-F]{40}$/;
    if (!addrRegexGet.test(owner)) return res.status(400).json({ error: 'invalid owner address format' });
    try {
      const { rows } = await pool.query(
        'SELECT * FROM budget_envelopes WHERE owner_address = $1 ORDER BY created_at DESC',
        [owner.toLowerCase()],
      );
      return res.json({ budgets: rows });
    } catch (e) {
      console.error('[budgets GET]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── POST /api/budgets ──
  if (req.method === 'POST') {
    const { owner_address, name, category, limit_amount, period_seconds } = req.body ?? {};
    if (!owner_address || !name || !limit_amount)
      return res.status(400).json({ error: 'missing fields' });

    const addrRegex = /^0x[0-9a-fA-F]{40}$/;
    if (!addrRegex.test(owner_address))
      return res.status(400).json({ error: 'invalid owner_address format' });

    if (isNaN(Number(limit_amount)) || Number(limit_amount) <= 0)
      return res.status(400).json({ error: 'limit_amount must be a positive number' });

    const VALID_CATS = ['payroll', 'subscription', 'grant', 'retainer', 'other'];
    if (category && !VALID_CATS.includes(category))
      return res.status(400).json({ error: `invalid category` });
    try {
      const now = Math.floor(Date.now() / 1000);
      const { rows } = await pool.query(
        `INSERT INTO budget_envelopes (owner_address, name, category, limit_amount, period_seconds, period_start_ts)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [owner_address.toLowerCase(), name, category ?? 'payroll', limit_amount, period_seconds ?? 2592000, now],
      );
      return res.status(201).json(rows[0]);
    } catch (e) {
      console.error('[budgets POST]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── PATCH /api/budgets?id=123 ──
  if (req.method === 'PATCH') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id required' });
    // Require owner_address so we can enforce ownership
    const { spent_amount, limit_amount, name, owner_address } = req.body ?? {};
    if (!owner_address) return res.status(400).json({ error: 'owner_address required for ownership check' });

    const sets: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];

    if (spent_amount !== undefined) { params.push(spent_amount);  sets.push(`spent_amount = $${params.length}`);  }
    if (limit_amount !== undefined) { params.push(limit_amount);  sets.push(`limit_amount = $${params.length}`);  }
    if (name)                       { params.push(name);          sets.push(`name = $${params.length}`);          }

    if (sets.length === 1) return res.status(400).json({ error: 'nothing to update' });

    // Ownership check: id AND owner_address must match
    params.push(String(Math.floor(Number(id))));
    params.push((owner_address as string).toLowerCase());
    try {
      const { rows } = await pool.query(
        `UPDATE budget_envelopes SET ${sets.join(', ')} WHERE id = $${params.length - 1} AND owner_address = $${params.length} RETURNING *`,
        params,
      );
      if (!rows[0]) return res.status(404).json({ error: 'not found or not authorized' });
      return res.json(rows[0]);
    } catch (e) {
      console.error('[budgets PATCH]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  // ── DELETE /api/budgets?id=123 ──
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id required' });
    // Require owner_address for ownership enforcement
    const { owner_address } = req.body ?? {};
    if (!owner_address) return res.status(400).json({ error: 'owner_address required' });
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM budget_envelopes WHERE id = $1 AND owner_address = $2',
        [String(Math.floor(Number(id))), (owner_address as string).toLowerCase()],
      );
      if (!rowCount) return res.status(404).json({ error: 'not found or not authorized' });
      return res.status(204).end();
    } catch (e) {
      console.error('[budgets DELETE]', e);
      return res.status(500).json({ error: 'internal server error' });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
