/**
 * ClaimPendingBanner — reads pendingWithdrawals[address] from the contract.
 * If > 0, shows a banner prompting the user to call claimPending().
 * Placed on the Dashboard so recipients who had a stream cancelled can
 * reclaim their accrued USDC.
 */
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { formatUSDC } from '@/lib/utils';
import { STREAM_VAULT_ABI, STREAM_VAULT_ADDRESS, TARGET_CHAIN_ID } from '@/lib/contract';

export function ClaimPendingBanner() {
  const { address } = useAccount();

  const { data: pending, refetch } = useReadContract({
    address: STREAM_VAULT_ADDRESS,
    abi: STREAM_VAULT_ABI,
    functionName: 'pendingWithdrawals',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: {
      enabled: !!address && STREAM_VAULT_ADDRESS !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 15000,
    },
  });

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!isSuccess) return;
    toast.success('Pending USDC claimed successfully');
    refetch().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message?.toLowerCase() ?? '';
    if (!msg.includes('user rejected')) {
      toast.error('Claim failed', { description: writeError.message?.slice(0, 100) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeError]);

  if (!pending || pending === 0n) return null;

  const isTxPending = isPending || isConfirming;

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl mb-6"
      style={{
        background: 'color-mix(in srgb, var(--success) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--success) 18%, transparent)' }}
        >
          <Inbox size={16} style={{ color: 'var(--success)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            You have pending USDC from a cancelled stream
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {formatUSDC(pending)} USDC is waiting for you to claim
          </p>
        </div>
      </div>
      <button
        disabled={isTxPending}
        onClick={() =>
          writeContract({
            address: STREAM_VAULT_ADDRESS,
            abi: STREAM_VAULT_ABI,
            functionName: 'claimPending',
            chainId: TARGET_CHAIN_ID,
          })
        }
        className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
        style={{ background: 'var(--success)' }}
      >
        {isTxPending ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {isPending ? 'Confirm...' : 'Claiming...'}
          </span>
        ) : (
          `Claim ${formatUSDC(pending)} USDC`
        )}
      </button>
    </div>
  );
}
