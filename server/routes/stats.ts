import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/stats?address=0x...  — dashboard summary
router.get('/', async (req: Request, res: Response) => {
  const { address } = req.query as Record<string, string>;
  if (!address) return res.status(400).json({ error: 'address required' });

  const addr = address.toLowerCase();
  try {
    // Active streams sent
    const { rows: sentRows } = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(rate_per_second),0) as total_rate, COALESCE(SUM(deposited_amount),0) as total_deposited
       FROM streams WHERE sender_address=$1 AND status='active'`,
      [addr],
    );
    // Active streams received
    const { rows: recvRows } = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(rate_per_second),0) as total_rate
       FROM streams WHERE recipient_address=$1 AND status='active'`,
      [addr],
    );
    // Completed streams
    const { rows: compRows } = await pool.query(
      `SELECT COUNT(*) as count FROM streams WHERE sender_address=$1 AND status='completed'`,
      [addr],
    );
    // Budget summary
    const { rows: budgetRows } = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(limit_amount),0) as total_limit, COALESCE(SUM(spent_amount),0) as total_spent
       FROM budget_envelopes WHERE owner_address=$1`,
      [addr],
    );

    return res.json({
      sent: {
        active_count: parseInt(sentRows[0].count),
        total_rate_per_second: sentRows[0].total_rate,
        total_deposited: sentRows[0].total_deposited,
      },
      received: {
        active_count: parseInt(recvRows[0].count),
        total_rate_per_second: recvRows[0].total_rate,
      },
      completed_count: parseInt(compRows[0].count),
      budgets: {
        count: parseInt(budgetRows[0].count),
        total_limit: budgetRows[0].total_limit,
        total_spent: budgetRows[0].total_spent,
      },
    });
  } catch {
    console.error('[stats GET]', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
