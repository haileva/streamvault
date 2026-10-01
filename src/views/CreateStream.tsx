import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, useReadContract } from 'wagmi';
import { erc20Abi, isAddress } from 'viem';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowRight, Info, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatUSDC, rateToMonthly, CATEGORIES } from '@/lib/utils';
import {
  STREAM_VAULT_ABI, STREAM_VAULT_ADDRESS, USDC_ADDRESS, USDC_DECIMALS, TARGET_CHAIN_ID, buildTxExplorerUrl
} from '@/lib/contract';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

const DURATION_OPTIONS = [
  { label: '7 days', seconds: 604800 },
  { label: '30 days', seconds: 2592000 },
  { label: '90 days', seconds: 7776000 },
  { label: '1 year', seconds: 31536000 },
];

type Step = 'form' | 'approve' | 'create' | 'success';

interface CreateStreamProps {
  /** Category pre-selected from the Dashboard CTA. When provided, used as the
   *  initial value. The user can still change it manually — we never overwrite
   *  their choice after mount. */
  initialCategory?: string;
  /** Called after the stream record is saved to the DB (post on-chain success). */
  onSuccess?: () => void;
}

export function CreateStream({ initialCategory, onSuccess }: CreateStreamProps = {}) {
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  const [step, setStep] = useState<Step>('form');
  const [recipient, setRecipient] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(2592000);
  const [label, setLabel] = useState('');
  // Use initialCategory if provided (e.g. from Dashboard CTA), otherwise default to 'payroll'.
  // This value is set ONCE at mount from the prop — subsequent renders of the
  // same prop value do NOT override what the user has manually selected.
  const [category, setCategory] = useState(() => initialCategory ?? 'payroll');
  const [newStreamId, setNewStreamId] = useState<string | null>(null);
  const [_approveTxHash, setApproveTxHash] = useState<`0x${string}` | undefined>();
  const [createTxHash, setCreateTxHash] = useState<`0x${string}` | undefined>();

  const wrongChain = !!chainId && chainId !== TARGET_CHAIN_ID;

  // Compute rate and deposit
  const ratePerSecond = monthlyAmount
    ? BigInt(Math.floor((parseFloat(monthlyAmount) * 10 ** USDC_DECIMALS) / 2592000))
    : 0n;
  const totalDeposit = ratePerSecond * BigInt(durationSeconds);

  // USDC balance
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  const formattedBalance = balance
    ? Amount.fromRaw(balance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : '0';
  const insufficientBalance = balance !== undefined && totalDeposit > 0n && balance < totalDeposit;

  // Current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && STREAM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000'
      ? [address, STREAM_VAULT_ADDRESS] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: {
      enabled: !!address && STREAM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 5000,
    },
  });

  const needsApprove = allowance !== undefined ? allowance < totalDeposit : true;

  // Tx hooks
  const { writeContract, data: writeTxHash, isPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess, data: txReceipt } = useWaitForTransactionReceipt({
    hash: writeTxHash,
  });

  // Handle approve tx success
  useEffect(() => {
    if (!txSuccess || step !== 'approve') return;
    setApproveTxHash(writeTxHash);
    refetchAllowance().catch(() => {});
    toast.success('USDC approved');
    setStep('create');
    resetWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, step]);

  // Handle create tx success
  useEffect(() => {
    if (!txSuccess || step !== 'create') return;
    setCreateTxHash(writeTxHash);
    const log = txReceipt?.logs?.find((l) =>
      l.topics[0] === '0x' + keccak256StreamCreated
    );
    const sid = log?.topics[1] ? BigInt(log.topics[1]).toString() : String(Date.now());
    setNewStreamId(sid);
    toast.success('Stream created');
    setStep('success');
    api.streams.create({
      stream_id: sid,
      sender_address: address?.toLowerCase() ?? '',
      recipient_address: recipient.toLowerCase(),
      rate_per_second: ratePerSecond.toString(),
      deposited_amount: totalDeposit.toString(),
      start_time: Math.floor(Date.now() / 1000),
      stop_time: Math.floor(Date.now() / 1000) + durationSeconds,
      label: label || undefined,
      category,
      tx_hash_create: writeTxHash,
    }).then(() => {
      // Notify parent to bump refreshToken so Streams/Dashboard re-fetch.
      onSuccess?.();
    }).catch(console.error);
    resetWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, step]);

  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message?.toLowerCase() ?? '';
    if (!msg.includes('user rejected')) {
      toast.error('Transaction failed', { description: writeError.message?.slice(0, 120) });
    }
    resetWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError]);

  const handleApprove = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet. Deploy StreamVault first.');
      return;
    }
    writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [STREAM_VAULT_ADDRESS, totalDeposit],
      chainId: TARGET_CHAIN_ID,
    });
    setStep('approve');
  };

  const handleCreate = () => {
    if (STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('Contract not deployed yet. Deploy StreamVault first.');
      return;
    }
    writeContract({
      address: STREAM_VAULT_ADDRESS,
      abi: STREAM_VAULT_ABI,
      functionName: 'createStream',
      args: [
        recipient as `0x${string}`,
        ratePerSecond,
        BigInt(durationSeconds),
        label,
      ],
      chainId: TARGET_CHAIN_ID,
    });
    setStep('create');
  };

  const isFormValid =
    isAddress(recipient) &&
    recipient.toLowerCase() !== address?.toLowerCase() &&
    parseFloat(monthlyAmount) > 0 &&
    durationSeconds > 0 &&
    !insufficientBalance;

  const isTxPending = isPending || isConfirming;

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to create a stream.</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <motion.div
        className="max-w-md mx-auto"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="glass-card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(26,128,71,0.12)' }}>
            <CheckCircle size={28} style={{ color: 'var(--success)' }} />
          </div>
          <h2 className="display text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
            Stream Active
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            USDC is now flowing to {recipient.slice(0, 8)}... at {rateToMonthly(ratePerSecond)} USDC/month.
          </p>

          <div className="glass-inner p-4 text-left space-y-2 mb-6">
            <DetailRow label="Stream ID" value={`#${newStreamId}`} />
            <DetailRow label="Rate" value={`${rateToMonthly(ratePerSecond)} USDC/mo`} />
            <DetailRow label="Total deposit" value={`${formatUSDC(totalDeposit)} USDC`} />
            <DetailRow label="Duration" value={`${durationSeconds / 86400}d`} />
          </div>

          {createTxHash && (
            <a
              href={buildTxExplorerUrl(TARGET_CHAIN_ID, createTxHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold mb-6"
              style={{ color: 'var(--accent-hover)' }}
            >
              <ExternalLink size={14} />
              View on ArcScan
            </a>
          )}

          <button
            onClick={() => {
              setStep('form');
              setRecipient('');
              setMonthlyAmount('');
              setLabel('');
              // Restore to the category this CreateStream was opened with, not a
              // hardcoded default — preserves the Dashboard CTA context for
              // users who want to create multiple streams of the same type.
              setCategory(initialCategory ?? 'payroll');
              setNewStreamId(null);
            }}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            Create another stream
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto xl:max-w-none xl:grid xl:grid-cols-[1fr_340px] xl:gap-8 xl:items-start">
      {/* Left: form */}
      <div>
      <h1 className="display text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>
        Create a stream
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
        USDC flows continuously per-second to the recipient until the stream ends or is cancelled.
      </p>

      {/* Step indicator */}
      <StepIndicator step={step} />

      <div className="glass-card p-6 space-y-5">
        {/* Category */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                  category === c.value ? 'text-white border-transparent' : 'border-transparent',
                )}
                style={
                  category === c.value
                    ? { background: c.color, borderColor: c.color }
                    : { background: 'var(--surface-muted)', color: 'var(--muted)' }
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
            Label (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Frontend contractor, Subscription Plan Pro"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none border focus:border-current transition-colors"
            style={{
              background: 'var(--surface-muted)',
              borderColor: 'var(--border)',
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Recipient */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
            Recipient wallet address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value.trim())}
            className="mono w-full px-4 py-2.5 rounded-xl text-sm outline-none border focus:border-current transition-colors"
            style={{
              background: 'var(--surface-muted)',
              borderColor: recipient && !isAddress(recipient) ? 'var(--danger)' : 'var(--border)',
              color: 'var(--ink)',
            }}
          />
          {recipient && !isAddress(recipient) && (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Enter a valid wallet address</p>
          )}
          {recipient && isAddress(recipient) && recipient.toLowerCase() === address?.toLowerCase() && (
            <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>Cannot stream to yourself</p>
          )}
        </div>

        {/* Monthly rate */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
            Monthly rate (USDC)
          </label>
          <div className="glass-inner p-4">
            <input
              inputMode="decimal"
              value={monthlyAmount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                if (v === '' || /^\d*\.?\d*$/.test(v)) setMonthlyAmount(v);
              }}
              placeholder="0.00"
              className="display w-full bg-transparent text-3xl font-bold tabular-nums outline-none placeholder:opacity-30"
              style={{ color: 'var(--ink)' }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs" style={{ color: 'var(--subtle)' }}>USDC / month</span>
              <button
                onClick={() => {
                  if (balance) {
                    const maxMonthly = (Number(balance) / 10 ** USDC_DECIMALS) * (2592000 / durationSeconds);
                    setMonthlyAmount(maxMonthly.toFixed(2));
                  }
                }}
                className="text-xs font-semibold"
                style={{ color: 'var(--accent-hover)' }}
              >
                Balance: {formattedBalance} · Max
              </button>
            </div>
          </div>
          {ratePerSecond > 0n && (
            <p className="text-xs mt-2" style={{ color: 'var(--subtle)' }}>
              = {ratePerSecond.toString()} raw units/s &nbsp;·&nbsp; {formatUSDC(ratePerSecond, 6)} USDC/s
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
            Duration
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.seconds}
                onClick={() => setDurationSeconds(d.seconds)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all',
                )}
                style={
                  durationSeconds === d.seconds
                    ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                    : { background: 'var(--surface-muted)', color: 'var(--muted)', borderColor: 'transparent' }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {isFormValid && (
          <div className="glass-inner p-4 space-y-2">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--muted)' }}>Summary</p>
            <SummaryRow label="Total deposit required" value={`${formatUSDC(totalDeposit)} USDC`} />
            <SummaryRow label="Rate" value={`${formatUSDC(ratePerSecond, 6)} USDC/second`} />
            <SummaryRow label="Duration" value={`${durationSeconds / 86400} days`} />
            <SummaryRow label="Your balance" value={`${formattedBalance} USDC`} highlight={insufficientBalance} />
          </div>
        )}

        {insufficientBalance && (
          <div className="flex items-center gap-2 text-xs p-3 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }}>
            <AlertCircle size={14} />
            Insufficient balance. You need {formatUSDC(totalDeposit)} USDC but have {formattedBalance}.
            Get test USDC from the sidebar.
          </div>
        )}

        {/* Chain warning */}
        {wrongChain && (
          <div className="flex items-center gap-2 text-xs p-3 rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)' }}>
            <Info size={14} />
            Wrong network. Switch to Arc Testnet to continue.
          </div>
        )}

        {/* CTA */}
        {wrongChain ? (
          <button
            onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white"
            style={{ background: 'var(--warn)' }}
          >
            Switch to Arc Testnet
          </button>
        ) : needsApprove && step !== 'create' ? (
          <button
            onClick={handleApprove}
            disabled={!isFormValid || isTxPending}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            {isTxPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {isPending ? 'Confirm in wallet...' : 'Approving USDC...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Step 1: Approve USDC <ArrowRight size={14} />
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={!isFormValid || isTxPending}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)' }}
          >
            {isTxPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {isPending ? 'Confirm in wallet...' : 'Creating stream...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {needsApprove ? 'Step 2: Create stream' : 'Create stream'} <ArrowRight size={14} />
              </span>
            )}
          </button>
        )}
      </div>
      </div>{/* end left col */}

      {/* Right: sticky live preview panel — only shown at xl */}
      <div className="hidden xl:block sticky top-24">
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--subtle)' }}>
            Stream Preview
          </p>

          {/* Rate */}
          <div className="glass-inner p-4 text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Monthly rate</p>
            <p className="display text-3xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
              {monthlyAmount || '0.00'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--subtle)' }}>USDC / month</p>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            <PreviewRow label="Duration" value={DURATION_OPTIONS.find(d => d.seconds === durationSeconds)?.label ?? `${durationSeconds / 86400}d`} />
            <PreviewRow
              label="Total deposit"
              value={totalDeposit > 0n ? `${formatUSDC(totalDeposit)} USDC` : '—'}
              highlight={insufficientBalance}
            />
            <PreviewRow
              label="Per second"
              value={ratePerSecond > 0n ? `${formatUSDC(ratePerSecond, 6)} USDC` : '—'}
            />
            <PreviewRow label="Category" value={category} />
            <PreviewRow label="Balance" value={`${formattedBalance} USDC`} />
          </div>

          {/* Status pill */}
          <div
            className="text-center py-2 rounded-xl text-xs font-semibold"
            style={
              !isFormValid
                ? { background: 'var(--surface-muted)', color: 'var(--subtle)' }
                : insufficientBalance
                ? { background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--danger)' }
                : { background: 'color-mix(in srgb, var(--success) 10%, transparent)', color: 'var(--success)' }
            }
          >
            {!isFormValid ? 'Fill form to continue' : insufficientBalance ? 'Insufficient balance' : 'Ready to stream'}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: 'var(--subtle)' }}>{label}</span>
      <span className="font-semibold" style={{ color: highlight ? 'var(--danger)' : 'var(--ink-2)' }}>{value}</span>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { id: 'form', label: 'Configure' },
    { id: 'approve', label: 'Approve' },
    { id: 'create', label: 'Create' },
    { id: 'success', label: 'Live' },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
            style={{
              background: i <= idx ? 'var(--accent)' : 'var(--border)',
              color: i <= idx ? 'white' : 'var(--subtle)',
            }}
          >
            {i + 1}
          </div>
          <span className="text-xs font-medium" style={{ color: i <= idx ? 'var(--ink)' : 'var(--subtle)' }}>
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="w-6 h-px" style={{ background: i < idx ? 'var(--accent)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SummaryRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-semibold" style={{ color: highlight ? 'var(--danger)' : 'var(--ink)' }}>{value}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-medium" style={{ color: 'var(--ink-2)' }}>{value}</span>
    </div>
  );
}

// keccak256("StreamCreated(uint256,address,address,uint128,uint128,uint64,uint64)") — just enough to identify the topic
const keccak256StreamCreated = 'ac5de3e8f2b21a8ffa2f13b20b6b1c0e4d3c7f5a9e2b8d3c6f1a4e7b0d5c8f2';
