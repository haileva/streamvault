import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { Plus, Trash2, Shield, Wallet, Info, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api, type BudgetRecord } from '@/lib/api';
import { formatUSDC, CATEGORIES } from '@/lib/utils';
import { USDC_ADDRESS, USDC_DECIMALS, TARGET_CHAIN_ID, STREAM_VAULT_ADDRESS } from '@/lib/contract';
import { Amount, usdcDecimalsFor } from '@/onchain-money';

export function Settings() {
  const { address, isConnected } = useAccount();
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('payroll');
  const [newLimit, setNewLimit] = useState('');
  const [newPeriod, setNewPeriod] = useState(2592000);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };
  const [saving, setSaving] = useState(false);

  // USDC balance
  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: TARGET_CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const formattedBalance = balance
    ? Amount.fromRaw(balance, usdcDecimalsFor(TARGET_CHAIN_ID)).toFixed(2)
    : '—';

  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!address) return;
    setLoading(true);
    api.budgets.list(address)
      .then(({ budgets: b }) => setBudgets(b))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  const handleAddBudget = async () => {
    if (!address || !newName || !newLimit) return;
    setSaving(true);
    try {
      const raw = BigInt(Math.floor(parseFloat(newLimit) * 10 ** USDC_DECIMALS));
      const b = await api.budgets.create({
        owner_address: address,
        name: newName,
        category: newCategory,
        limit_amount: raw.toString(),
        period_seconds: newPeriod,
      });
      setBudgets((prev) => [b, ...prev]);
      setShowAdd(false);
      setNewName('');
      setNewLimit('');
      toast.success('Budget created');
    } catch {
      toast.error('Failed to create budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.budgets.delete(id);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
      toast.success('Budget removed');
    } catch {
      toast.error('Failed to delete budget');
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Connect your wallet to manage settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>Settings</h1>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left column: wallet + contract */}
        <div className="space-y-5">
        {/* Wallet overview */}
        <section className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} style={{ color: 'var(--muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Wallet</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--muted)' }}>Address</span>
              <button
                onClick={() => address && copy(address, 'wallet')}
                className="flex items-center gap-1 mono text-xs hover-surface rounded px-1.5 py-0.5 transition-colors"
                style={{ color: 'var(--ink-2)' }}
                title={address}
              >
                {address?.slice(0, 10)}...{address?.slice(-6)}
                {copied === 'wallet'
                  ? <Check size={10} style={{ color: 'var(--success)' }} />
                  : <Copy size={10} style={{ color: 'var(--subtle)' }} />}
              </button>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted)' }}>USDC balance</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>
                {formattedBalance} USDC
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted)' }}>Network</span>
              <span style={{ color: 'var(--success)' }} className="font-medium">Arc Testnet</span>
            </div>
          </div>
        </section>

        {/* Contract info */}
        <section className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} style={{ color: 'var(--muted)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Contract</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--muted)' }}>StreamVault address</span>
              {STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000' ? (
                <span className="mono text-xs" style={{ color: 'var(--subtle)' }}>Not deployed</span>
              ) : (
                <button
                  onClick={() => copy(STREAM_VAULT_ADDRESS, 'contract')}
                  className="flex items-center gap-1 mono text-xs hover-surface rounded px-1.5 py-0.5 transition-colors"
                  style={{ color: 'var(--ink-2)' }}
                  title={STREAM_VAULT_ADDRESS}
                >
                  {STREAM_VAULT_ADDRESS.slice(0, 10)}...{STREAM_VAULT_ADDRESS.slice(-6)}
                  {copied === 'contract'
                    ? <Check size={10} style={{ color: 'var(--success)' }} />
                    : <Copy size={10} style={{ color: 'var(--subtle)' }} />}
                </button>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--muted)' }}>USDC token</span>
              <button
                onClick={() => copy(USDC_ADDRESS, 'usdc')}
                className="flex items-center gap-1 mono text-xs hover-surface rounded px-1.5 py-0.5 transition-colors"
                style={{ color: 'var(--ink-2)' }}
                title={USDC_ADDRESS}
              >
                {USDC_ADDRESS.slice(0, 10)}...{USDC_ADDRESS.slice(-6)}
                {copied === 'usdc'
                  ? <Check size={10} style={{ color: 'var(--success)' }} />
                  : <Copy size={10} style={{ color: 'var(--subtle)' }} />}
              </button>
            </div>
          </div>
          {STREAM_VAULT_ADDRESS === '0x0000000000000000000000000000000000000000' && (
            <div className="mt-3 flex items-start gap-2 text-xs p-3 rounded-xl"
              style={{ background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)' }}>
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              Contract not deployed. Deploy StreamVault to start creating streams.
            </div>
          )}
        </section>
        </div>{/* end left col */}

        {/* Right column: budget envelopes */}
        <section className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Budget Envelopes</h2>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Plus size={12} />
              Add budget
            </button>
          </div>

          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            Budget envelopes help you track spending limits per category. They are stored off-chain in your local database and do not enforce onchain limits.
          </p>

          {showAdd && (
            <div className="glass-inner p-4 mb-4 space-y-3">
              <input
                placeholder="Budget name (e.g. Engineering payroll)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none border"
                style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--ink)' }}
              />
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input
                  placeholder="Limit USDC"
                  inputMode="decimal"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border"
                  style={{ background: 'var(--surface-muted)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                  Reset period
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Weekly', seconds: 604800 },
                    { label: 'Monthly', seconds: 2592000 },
                    { label: 'Quarterly', seconds: 7776000 },
                    { label: 'Yearly', seconds: 31536000 },
                  ].map((p) => (
                    <button
                      key={p.seconds}
                      type="button"
                      onClick={() => setNewPeriod(p.seconds)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                      style={
                        newPeriod === p.seconds
                          ? { background: 'var(--accent)', color: 'white', borderColor: 'var(--accent)' }
                          : { background: 'var(--surface-muted)', color: 'var(--muted)', borderColor: 'var(--border)' }
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleAddBudget()}
                  disabled={saving || !newName || !newLimit}
                  className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
                  style={{ background: 'var(--accent)' }}
                >
                  {saving ? 'Saving...' : 'Save budget'}
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="text-xs px-4 py-2 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
              ))}
            </div>
          ) : budgets.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--subtle)' }}>
              No budgets yet. Add one to track spending limits.
            </p>
          ) : (
            <div className="space-y-2">
              {budgets.map((b) => {
                const spent = Number(b.spent_amount) / 10 ** USDC_DECIMALS;
                const limit = Number(b.limit_amount) / 10 ** USDC_DECIMALS;
                const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                const cat = CATEGORIES.find((c) => c.value === b.category);

                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--surface-muted)' }}
                  >
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: cat?.color ?? 'var(--muted)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate" style={{ color: 'var(--ink)' }}>{b.name}</span>
                        <span style={{ color: 'var(--muted)' }}>
                          {formatUSDC(BigInt(b.spent_amount))} / {formatUSDC(BigInt(b.limit_amount))} USDC
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warn)' : cat?.color ?? 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => void handleDelete(b.id)}
                      className="p-1.5 rounded-lg hover-surface transition-colors flex-shrink-0"
                      style={{ color: 'var(--subtle)' }}
                      aria-label="Delete budget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
