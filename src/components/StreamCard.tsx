import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Pause, Play, X, ArrowDownToLine, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { StreamRecord } from '@/lib/api';
import { api } from '@/lib/api';
import {
  formatAddress, formatUSDC, formatDuration, formatTs, streamProgress,
  rateToMonthly, categoryColor, cn
} from '@/lib/utils';
import {
  STREAM_VAULT_ABI, STREAM_VAULT_ADDRESS, TARGET_CHAIN_ID, buildTxExplorerUrl
} from '@/lib/contract';

interface StreamCardProps {
  stream: StreamRecord;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--success)',
  paused: 'var(--warn)',
  completed: 'var(--stream-blue)',
  cancelled: 'var(--danger)',
};

export function StreamCard({ stream, onRefresh }: StreamCardProps) {
  const { address } = useAccount();
  const [expanded, setExpanded] = useState(false);
  const [liveBalance, setLiveBalance] = useState<{ recipient: bigint; sender: bigint } | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const isSender = address?.toLowerCase() === stream.sender_address;
  const isRecipient = address?.toLowerCase() === stream.recipient_address;

  // Live ticker
  useEffect(() => {
    if (stream.status !== 'active') return;
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [stream.status]);

  // On-chain balance read
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: STREAM_VAULT_ADDRESS,
    abi: STREAM_VAULT_ABI,
    functionName: 'balanceOf',
    args: [BigInt(stream.stream_id)],
    chainId: TARGET_CHAIN_ID,
    query: { refetchInterval: 5000, enabled: STREAM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000' },
  });

  useEffect(() => {
    if (balanceData) {
      setLiveBalance({ recipient: balanceData[0], sender: balanceData[1] });
    }
  }, [balanceData]);

  // Tx hooks
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    toast.success('Transaction confirmed');
    refetchBalance().catch(() => {});
    onRefresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message?.toLowerCase() ?? '';
    if (!msg.includes('user rejected')) {
      toast.error('Transaction failed', { description: writeError.message?.slice(0, 120) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError]);

  const isTxPending = isPending || isConfirming;

  // Actions
  const handleWithdraw = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet');
      return;
    }
    writeContract({
      address: STREAM_VAULT_ADDRESS,
      abi: STREAM_VAULT_ABI,
      functionName: 'withdrawFromStream',
      args: [BigInt(stream.stream_id)],
      chainId: TARGET_CHAIN_ID,
    });
  };

  const handlePause = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet');
      return;
    }
    writeContract({
      address: STREAM_VAULT_ADDRESS,
      abi: STREAM_VAULT_ABI,
      functionName: 'pauseStream',
      args: [BigInt(stream.stream_id)],
      chainId: TARGET_CHAIN_ID,
    });
    api.streams.update(stream.stream_id, { status: 'paused' }).catch(() => {});
  };

  const handleResume = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet');
      return;
    }
    writeContract({
      address: STREAM_VAULT_ADDRESS,
      abi: STREAM_VAULT_ABI,
      functionName: 'resumeStream',
      args: [BigInt(stream.stream_id)],
      chainId: TARGET_CHAIN_ID,
    });
    api.streams.update(stream.stream_id, { status: 'active' }).catch(() => {});
  };

  const handleCancel = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet');
      return;
    }
    if (!window.confirm('Cancel this stream? The recipient will receive accrued USDC and the sender gets the remainder.')) return;
    writeContract({
      address: STREAM_VAULT_ADDRESS,
      abi: STREAM_VAULT_ABI,
      functionName: 'cancelStream',
      args: [BigInt(stream.stream_id)],
      chainId: TARGET_CHAIN_ID,
    });
    api.streams.update(stream.stream_id, { status: 'cancelled' }).catch(() => {});
  };

  const progress = streamProgress(stream.start_time, stream.stop_time, now);
  const elapsed = Math.max(0, now - stream.start_time);
  const remaining = Math.max(0, stream.stop_time - now);

  // Live accrued — use on-chain balance if available, fallback to computed
  const liveAccrued: bigint = liveBalance
    ? liveBalance.recipient + BigInt(stream.withdrawn_amount)
    : BigInt(stream.rate_per_second) * BigInt(elapsed);

  const statusColor = STATUS_COLORS[stream.status] ?? 'var(--subtle)';

  return (
    <motion.div
      layout
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Category strip */}
      <div className="h-1 w-full" style={{ background: categoryColor(stream.category) }} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${statusColor}18`, color: statusColor }}
              >
                {stream.status === 'active' && <span className="w-1.5 h-1.5 rounded-full stream-pulse" style={{ background: statusColor }} />}
                {stream.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-muted)', color: 'var(--muted)' }}>
                {stream.category}
              </span>
            </div>
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
              {stream.label || `Stream #${stream.stream_id}`}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="display font-bold tabular-nums text-sm" style={{ color: 'var(--ink)' }}>
              {rateToMonthly(stream.rate_per_second)}
            </p>
            <p className="text-xs" style={{ color: 'var(--subtle)' }}>USDC/mo</p>
          </div>
        </div>

        {/* Addresses */}
        <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="mono">{formatAddress(stream.sender_address)}</span>
          <ArrowRightIcon />
          <span className="mono">{formatAddress(stream.recipient_address)}</span>
        </div>

        {/* Progress */}
        {(stream.status === 'active' || stream.status === 'paused') && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--subtle)' }}>
              <span>{formatUSDC(liveAccrued)} USDC flowed</span>
              <span>{remaining > 0 ? formatDuration(remaining) + ' left' : 'complete'}</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: categoryColor(stream.category) }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>{progress}% disbursed</p>
          </div>
        )}

        {/* Live accrued balance (for recipient) */}
        {isRecipient && stream.status === 'active' && liveBalance !== null && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}>
            <p className="text-xs" style={{ color: 'var(--success)' }}>Available to withdraw</p>
            <p className="display text-lg font-bold tabular-nums" style={{ color: 'var(--success)' }}>
              {formatUSDC(liveBalance.recipient)} USDC
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {isRecipient && stream.status === 'active' && (
            <ActionButton
              onClick={handleWithdraw}
              loading={isTxPending}
              icon={<ArrowDownToLine size={14} />}
              label="Withdraw"
              primary
            />
          )}
          {isSender && stream.status === 'active' && (
            <ActionButton
              onClick={handlePause}
              loading={isTxPending}
              icon={<Pause size={14} />}
              label="Pause"
            />
          )}
          {isSender && stream.status === 'paused' && (
            <ActionButton
              onClick={handleResume}
              loading={isTxPending}
              icon={<Play size={14} />}
              label="Resume"
              primary
            />
          )}
          {isSender && (stream.status === 'active' || stream.status === 'paused') && (
            <ActionButton
              onClick={handleCancel}
              loading={isTxPending}
              icon={<X size={14} />}
              label="Cancel"
              danger
            />
          )}

          {txHash && (
            <a
              href={buildTxExplorerUrl(TARGET_CHAIN_ID, txHash)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border transition-colors hover-surface"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <ExternalLink size={12} />
              View tx
            </a>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl ml-auto transition-colors hover-surface"
            style={{ color: 'var(--subtle)' }}
          >
            Details
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t space-y-2"
            style={{ borderColor: 'var(--border)' }}
          >
            <DetailRow label="Stream ID" value={`#${stream.stream_id}`} mono />
            <DetailRow label="Total deposit" value={`${formatUSDC(BigInt(stream.deposited_amount))} USDC`} />
            <DetailRow label="Rate" value={`${formatUSDC(BigInt(stream.rate_per_second), 6)}/s`} />
            <DetailRow label="Started" value={formatTs(stream.start_time)} />
            <DetailRow label="Ends" value={formatTs(stream.stop_time)} />
            <DetailRow label="Sender" value={stream.sender_address} mono />
            <DetailRow label="Recipient" value={stream.recipient_address} mono />
            {stream.tx_hash_create && (
              <DetailRow
                label="Create tx"
                value={stream.tx_hash_create.slice(0, 20) + '...'}
                link={buildTxExplorerUrl(TARGET_CHAIN_ID, stream.tx_hash_create)}
                mono
              />
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({
  onClick, loading, icon, label, primary, danger
}: {
  onClick: () => void;
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        primary ? 'text-white' : danger ? 'border' : 'border hover-surface',
      )}
      style={
        primary
          ? { background: 'var(--accent)', color: 'white' }
          : danger
            ? { borderColor: 'var(--danger)', color: 'var(--danger)' }
            : { borderColor: 'var(--border)', color: 'var(--muted)' }
      }
    >
      {loading ? (
        <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : icon}
      {label}
    </button>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DetailRow({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className={cn('truncate max-w-[200px] underline', mono ? 'mono' : '')}
          style={{ color: 'var(--accent-hover)' }}
        >
          {value}
        </a>
      ) : (
        <span
          className={cn('truncate max-w-[200px]', mono ? 'mono' : '')}
          style={{ color: 'var(--ink-2)' }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
