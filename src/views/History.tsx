import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { api, type StreamRecord } from '@/lib/api';
import { formatUSDC, formatTs, rateToMonthly, categoryColor, formatAddress } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, Pause } from 'lucide-react';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  active: <Pause size={14} style={{ color: 'var(--stream-blue)' }} />,
  paused: <AlertTriangle size={14} style={{ color: 'var(--warn)' }} />,
  completed: <CheckCircle size={14} style={{ color: 'var(--success)' }} />,
  cancelled: <XCircle size={14} style={{ color: 'var(--danger)' }} />,
};

export function History() {
  const { address, isConnected } = useAccount();
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api.streams
      .list(address, { limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })
      .then(({ streams: s, total: t }) => {
        setStreams(s);
        setTotal(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address, page]);

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to view history.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>History</h1>

      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div
          className="grid grid-cols-[120px_1fr_160px_120px_120px_110px] gap-4 px-6 py-3.5 border-b text-xs font-semibold uppercase tracking-wider"
          style={{ borderColor: 'var(--border)', color: 'var(--subtle)' }}
        >
          <span>Status</span>
          <span>Label</span>
          <span>Counterparty</span>
          <span className="text-right">Deposited</span>
          <span className="text-right">Rate / mo</span>
          <span className="text-right">Started</span>
        </div>

        {loading ? (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-4 rounded w-48" style={{ background: 'var(--border)' }} />
              </div>
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No streams yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {streams.map((s) => (
              <div
                key={s.stream_id}
                className="grid grid-cols-[120px_1fr_160px_120px_120px_110px] gap-4 px-6 py-3.5 hover-surface transition-colors items-center"
              >
                {/* Status */}
                <div className="flex items-center gap-1.5">
                  {STATUS_ICONS[s.status]}
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>{s.status}</span>
                </div>

                {/* Label */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: categoryColor(s.category) }}
                    />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {s.label || `Stream #${s.stream_id}`}
                    </span>
                  </div>
                </div>

                {/* Recipient */}
                <span className="mono text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {formatAddress(s.sender_address.toLowerCase() === address?.toLowerCase()
                    ? s.recipient_address
                    : s.sender_address)}
                  <span className="ml-1 text-[10px]" style={{ color: 'var(--subtle)' }}>
                    ({s.sender_address.toLowerCase() === address?.toLowerCase() ? 'to' : 'from'})
                  </span>
                </span>

                {/* Total deposited */}
                <span className="text-sm tabular-nums text-right font-semibold" style={{ color: 'var(--ink)' }}>
                  {formatUSDC(BigInt(s.deposited_amount))}
                </span>

                {/* Rate */}
                <span className="text-xs tabular-nums text-right" style={{ color: 'var(--muted)' }}>
                  {rateToMonthly(s.rate_per_second)}/mo
                </span>

                {/* Started */}
                <span className="text-xs text-right" style={{ color: 'var(--subtle)' }}>
                  {formatTs(s.start_time)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer pagination */}
        {total > PAGE_SIZE && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
          >
            <span>{total} total</span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
              >
                Prev
              </button>
              <button
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40"
                style={{ borderColor: 'var(--border)' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
