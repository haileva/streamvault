// API client — works both locally (Vite proxy → Express) and on Vercel (serverless functions)
// Path-based routes (/api/streams/123) are rewritten by vercel.json to (?streamId=123)
// so both environments resolve correctly.

const BASE = '/api';

export interface StreamRecord {
  id: number;
  stream_id: string;
  sender_address: string;
  recipient_address: string;
  rate_per_second: string;
  deposited_amount: string;
  withdrawn_amount: string;
  start_time: number;
  stop_time: number;
  label: string | null;
  category: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  tx_hash_create: string | null;
  tx_hash_cancel: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetRecord {
  id: number;
  owner_address: string;
  name: string;
  category: string;
  limit_amount: string;
  period_seconds: number;
  period_start_ts: number;
  spent_amount: string;
  created_at: string;
}

export interface DashboardStats {
  sent: { active_count: number; total_rate_per_second: string; total_deposited: string };
  received: { active_count: number; total_rate_per_second: string };
  completed_count: number;
  budgets: { count: number; total_limit: string; total_spent: string };
}

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  // Only skip params that are strictly undefined/null — preserve '0', 'false', etc.
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown, queryParams?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (queryParams) Object.entries(queryParams).forEach(([k, v]) => v && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API PATCH ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string, queryParams?: Record<string, string>, body?: Record<string, string>): Promise<void> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  if (queryParams) Object.entries(queryParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    method: 'DELETE',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  // 204 No Content is the expected success; anything else is an error
  if (!res.ok && res.status !== 204) throw new Error(`API DELETE ${path}: ${res.status}`);
}

export const api = {
  streams: {
    list: (address: string, params: Record<string, string> = {}) =>
      get<{ streams: StreamRecord[]; total: number }>('/streams', { address, ...params }),
    get: (streamId: string) =>
      get<StreamRecord>('/streams', { streamId }),
    create: (data: Partial<StreamRecord>) =>
      post<StreamRecord>('/streams', data),
    update: (streamId: string, data: Partial<StreamRecord>) =>
      patch<StreamRecord>('/streams', data, { streamId }),
  },
  budgets: {
    list: (owner: string) =>
      get<{ budgets: BudgetRecord[] }>('/budgets', { owner }),
    create: (data: Partial<BudgetRecord>) =>
      post<BudgetRecord>('/budgets', data),
    update: (id: number, data: Partial<BudgetRecord> & { owner_address: string }) =>
      patch<BudgetRecord>('/budgets', data, { id: String(id) }),
    delete: (id: number, ownerAddress: string) =>
      del('/budgets', { id: String(id) }, { owner_address: ownerAddress }),
  },
  stats: (address: string) =>
    get<DashboardStats>('/stats', { address }),
};
