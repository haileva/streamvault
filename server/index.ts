import express from 'express';
import cors from 'cors';
import { initSchema } from './db';
import streamsRouter from './routes/streams';
import budgetsRouter from './routes/budgets';
import statsRouter from './routes/stats';

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/streams', streamsRouter);
app.use('/budgets', budgetsRouter);
app.use('/stats', statsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

async function main() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`[server] StreamVault API listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] Fatal error:', err);
  process.exit(1);
});
