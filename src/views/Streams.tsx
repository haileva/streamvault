import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { RefreshCw, Search } from 'lucide-react';
import { api, type StreamRecord } from '@/lib/api';
import { StreamCard } from '@/components/StreamCard';
import { CATEGORIES, cn } from '@/lib/utils';
import type { View } from '@/components/Layout';

const STATUSES = ['all', 'active', 'paused', 'completed', 'cancelled'] as const;
const ROLES = ['all', 'sender', 'recipient'] as const;

interface StreamsProps {
  onNav: (v: View) => void;
}

export function Streams({ onNav }: StreamsProps) {
  const { address, isConnected } = useAccount();
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('all');
  const [role, setRole] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const fetchStreams = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    };
    if (status !== 'all') params.status = status;
    if (role !== 'all') params.role = role;
    if (category !== 'all') params.category = category;
    try {
      const { streams: s, total: t } = await api.streams.list(address, params);
      setStreams(s);
      setTotal(t);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [address, status, role, category, page]);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setPage(0);
  }, [status, role, category]);

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    void fetchStreams();
  }, [fetchStreams]);

  const filtered = search
    ? streams.filter(
        (s) =>
          s.label?.toLowerCase().includes(search.toLowerCase()) ||
          s.recipient_address.includes(search.toLowerCase()) ||
          s.sender_address.includes(search.toLowerCase()) ||
          s.stream_id.includes(search),
      )
    : streams;

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to view streams.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="display text-2xl font-bold" style={{ color: 'var(--ink)' }}>Streams</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {total} stream{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void fetchStreams()}
            className={cn('p-2.5 rounded-xl border transition-colors hover:bg-black/5', loading ? 'animate-spin' : '')}
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => onNav('create')}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl text-white"
            style={{ background: 'var(--accent)' }}
          >
            New stream
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--subtle)' }} />
          <input
            type="text"
            placeholder="Search by label, address, or stream ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 rounded-xl text-sm outline-none border"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-4">
          <FilterGroup
            label="Status"
            options={STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All' : s }))}
            value={status}
            onChange={setStatus}
          />
          <FilterGroup
            label="Role"
            options={ROLES.map((r) => ({ value: r, label: r === 'all' ? 'All' : r }))}
            value={role}
            onChange={setRole}
          />
          <FilterGroup
            label="Category"
            options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
            value={category}
            onChange={setCategory}
          />
        </div>
      </div>

      {/* Stream list */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card h-40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center border-2 border-dashed"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="font-semibold mb-2" style={{ color: 'var(--ink-2)' }}>No streams found</p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
            {search ? 'Try a different search term.' : 'Create a stream to get started.'}
          </p>
          {!search && (
            <button
              onClick={() => onNav('create')}
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
              style={{ background: 'var(--accent)' }}
            >
              Create stream
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <StreamCard key={s.stream_id} stream={s} onRefresh={() => void fetchStreams()} />
            ))}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl text-xs border disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl text-xs border disabled:opacity-40"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterGroup({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs" style={{ color: 'var(--subtle)' }}>{label}:</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className="text-xs px-2.5 py-1 rounded-lg transition-all"
          style={
            value === o.value
              ? { background: 'var(--accent)', color: 'white' }
              : { background: 'var(--surface-muted)', color: 'var(--muted)' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
