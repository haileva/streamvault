import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { TrendingUp, TrendingDown, Zap, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
// motion is used in StatCard
import { api, type DashboardStats, type StreamRecord } from '@/lib/api';
import { StreamCard } from '@/components/StreamCard';
import { rateToMonthly } from '@/lib/utils';
import { USDC_ADDRESS, TARGET_CHAIN_ID } from '@/lib/contract';
import { Amount, usdcDecimalsFor } from '@/onchain-money';
import type { View } from '@/components/Layout';

interface DashboardProps {
  onNav: (v: View) => void;
  onNavToCreate: (category?: string) => void;
  refreshToken: number;
}

export function Dashboard({ onNav, onNavToCreate, refreshToken }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeStreams, setActiveStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const formattedBalance = usdcBalance
    ? Amount.fromRaw(usdcBalance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : null;

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      api.stats(address),
      api.streams.list(address, { status: 'active', limit: '4' }),
    ])
      .then(([s, { streams }]) => {
        setStats(s);
        setActiveStreams(streams);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // refreshToken intentionally included: bumped after create/update to force re-fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, refreshToken]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: 'var(--surface-muted)' }}
        >
          <Activity size={28} style={{ color: 'var(--subtle)' }} />
        </div>
        <h2 className="display text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
          Connect your wallet
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--muted)' }}>
          StreamVault lets you send and receive USDC per-second, continuously — like payroll that never waits for payday.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero row — 4 stat cards, comfortable on all widths */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        <StatCard
          title="USDC Balance"
          value={formattedBalance ? `${formattedBalance}` : '—'}
          unit="USDC"
          icon={<DollarSign size={16} />}
          color="var(--stream-blue)"
          loading={formattedBalance === null}
        />
        <StatCard
          title="Sending"
          value={stats ? String(stats.sent.active_count) : '—'}
          unit="active streams"
          sub={stats ? `${rateToMonthly(stats.sent.total_rate_per_second)} USDC/mo out` : undefined}
          icon={<TrendingUp size={16} />}
          color="var(--danger)"
          loading={loading}
        />
        <StatCard
          title="Receiving"
          value={stats ? String(stats.received.active_count) : '—'}
          unit="active streams"
          sub={stats ? `${rateToMonthly(stats.received.total_rate_per_second)} USDC/mo in` : undefined}
          icon={<TrendingDown size={16} />}
          color="var(--success)"
          loading={loading}
        />
        <StatCard
          title="Completed"
          value={stats ? String(stats.completed_count) : '—'}
          unit="streams total"
          icon={<Zap size={16} />}
          color="var(--stream-purple)"
          loading={loading}
        />
      </div>

      {/* Active streams preview */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="display font-bold text-lg" style={{ color: 'var(--ink)' }}>
              Active Streams
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--subtle)' }}>
              Real-time USDC flows
            </p>
          </div>
          <button
            onClick={() => onNav('streams')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg hover-surface transition-colors"
            style={{ color: 'var(--accent-hover)', border: '1px solid var(--border)' }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card h-48 animate-pulse" />
            ))}
          </div>
        ) : activeStreams.length === 0 ? (
          <EmptyState
            title="No active streams"
            description="Create your first stream to start continuous USDC payments."
            cta="Create Stream"
            onCta={() => onNavToCreate()}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeStreams.map((s) => (
              <StreamCard key={s.stream_id} stream={s} onRefresh={() => {}} />
            ))}
          </div>
        )}
      </div>

      {/* CTA cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <CtaCard
            title="Pay a contributor"
            desc="Stream USDC per-second as payroll or retainer."
            cta="New payroll stream"
            onClick={() => onNavToCreate('payroll')}
            color="var(--stream-blue)"
          />
          <CtaCard
            title="Bill subscribers"
            desc="Recurring subscription payments, continuously."
            cta="New subscription stream"
            onClick={() => onNavToCreate('subscription')}
            color="var(--stream-purple)"
          />
          <CtaCard
            title="Grant funding"
            desc="Drip grant funds to contributors over time."
            cta="New grant stream"
            onClick={() => onNavToCreate('grant')}
            color="var(--stream-teal)"
          />
          <CtaCard
            title="View history"
            desc="See all past and completed streams."
            cta="Open history"
            onClick={() => onNav('history')}
            color="var(--warn)"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  title, value, unit, sub, icon, color, loading
}: {
  title: string; value: string; unit: string; sub?: string;
  icon: React.ReactNode; color: string; loading?: boolean;
}) {
  return (
    <motion.div
      className="glass-card p-5 lg:p-6 flex flex-col gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Top row: icon + title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          {title}
        </span>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: 'var(--border)' }} />
      ) : (
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="display text-3xl font-bold tabular-nums leading-none" style={{ color: 'var(--ink)' }}>
              {value}
            </span>
            <span className="text-xs" style={{ color: 'var(--subtle)' }}>{unit}</span>
          </div>
          {sub && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{sub}</p>
          )}
        </div>
      )}

      {/* Color accent bar */}
      <div className="h-0.5 rounded-full mt-auto" style={{ background: `color-mix(in srgb, ${color} 30%, transparent)` }} />
    </motion.div>
  );
}

function EmptyState({ title, description, cta, onCta }: {
  title: string; description: string; cta: string; onCta: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-8 text-center border-2 border-dashed"
      style={{ borderColor: 'var(--border)' }}
    >
      <p className="font-semibold mb-1" style={{ color: 'var(--ink-2)' }}>{title}</p>
      <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>{description}</p>
      <button
        onClick={onCta}
        className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
        style={{ background: 'var(--accent)' }}
      >
        {cta}
      </button>
    </div>
  );
}

function CtaCard({ title, desc, cta, onClick, color }: {
  title: string; desc: string; cta: string; onClick: () => void; color: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="w-1 h-8 rounded-full mb-3" style={{ background: color }} />
      <p className="font-bold text-sm mb-1" style={{ color: 'var(--ink)' }}>{title}</p>
      <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{desc}</p>
      <button
        onClick={onClick}
        className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-colors hover:opacity-90"
        style={{ background: color }}
      >
        {cta}
      </button>
    </div>
  );
}
