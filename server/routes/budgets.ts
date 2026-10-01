import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/budgets?owner=0x...
router.get('/', async (req: Request, res: Response) => {
  const { owner } = req.query as Record<string, string>;
  if (!owner) return res.status(400).json({ error: 'owner required' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM budget_envelopes WHERE owner_address = $1 ORDER BY created_at DESC',
      [owner.toLowerCase()],
    );
    return res.json({ budgets: rows });
  } catch {
    return res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/budgets
router.post('/', async (req: Request, res: Response) => {
  const { owner_address, name, category, limit_amount, period_seconds } = req.body;
  if (!owner_address || !name || !limit_amount) return res.status(400).json({ error: 'missing fields' });
  try {
    const now = Math.floor(Date.now() / 1000);
    const { rows } = await pool.query(
      `INSERT INTO budget_envelopes (owner_address, name, category, limit_amount, period_seconds, period_start_ts)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [owner_address.toLowerCase(), name, category || 'payroll', limit_amount, period_seconds || 2592000, now],
    );
    return res.status(201).json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'internal server error' });
  }
});

// PATCH /api/budgets/:id — update spent_amount
router.patch('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { spent_amount, limit_amount, name } = req.body;
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  if (spent_amount !== undefined) { params.push(spent_amount); sets.push(`spent_amount = $${params.length}`); }
  if (limit_amount !== undefined) { params.push(limit_amount); sets.push(`limit_amount = $${params.length}`); }
  if (name) { params.push(name); sets.push(`name = $${params.length}`); }
  params.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE budget_envelopes SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: 'internal server error' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM budget_envelopes WHERE id = $1', [id]);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
