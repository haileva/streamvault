import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool } from './_db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  let pool;
  try { pool = getPool(); } catch (e) {
    return res.status(503).json({ error: 'database not configured', detail: (e as Error).message });
  }

  const { address } = req.query as Record<string, string>;
  if (!address) return res.status(400).json({ error: 'address required' });

  const addr = address.toLowerCase();

  try {
    const [sentR, recvR, compR, budgR] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(rate_per_second),0) as total_rate,
                COALESCE(SUM(deposited_amount),0) as total_deposited
         FROM streams WHERE sender_address=$1 AND status='active'`,
        [addr],
      ),
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(rate_per_second),0) as total_rate
         FROM streams WHERE recipient_address=$1 AND status='active'`,
        [addr],
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM streams WHERE sender_address=$1 AND status='completed'`,
        [addr],
      ),
      pool.query(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(limit_amount),0) as total_limit,
                COALESCE(SUM(spent_amount),0) as total_spent
         FROM budget_envelopes WHERE owner_address=$1`,
        [addr],
      ),
    ]);

    return res.json({
      sent: {
        active_count: parseInt(sentR.rows[0].count),
        total_rate_per_second: sentR.rows[0].total_rate,
        total_deposited: sentR.rows[0].total_deposited,
      },
      received: {
        active_count: parseInt(recvR.rows[0].count),
        total_rate_per_second: recvR.rows[0].total_rate,
      },
      completed_count: parseInt(compR.rows[0].count),
      budgets: {
        count: parseInt(budgR.rows[0].count),
        total_limit: budgR.rows[0].total_limit,
        total_spent: budgR.rows[0].total_spent,
      },
    });
  } catch (e) {
    console.error('[stats GET]', e);
    return res.status(500).json({ error: 'internal server error' });
  }
}
