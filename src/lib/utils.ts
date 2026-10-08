// Utility helpers for StreamVault

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatUSDC(raw: bigint | string | number, decimals = 6): string {
  const n = typeof raw === 'bigint' ? raw : BigInt(Math.floor(Number(raw)));
  // Guard: clamp negative amounts to 0 (can occur with stale state during tx processing)
  const abs = n < 0n ? 0n : n;
  const divisor = BigInt(10 ** decimals);
  const whole = abs / divisor;
  const frac = abs % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 2);
  return `${whole.toLocaleString('en-US')}.${fracStr}`;
}

/** seconds -> "2h 15m" or "3d 4h" or "45s" */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** unix ts -> "Oct 12, 2026 14:30" */
export function formatTs(ts: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts * 1000));
}

/** 0–100 percentage */
export function streamProgress(startTime: number, stopTime: number, now = Date.now() / 1000): number {
  const total = stopTime - startTime;
  if (total <= 0) return 100;
  const elapsed = Math.max(0, Math.min(now - startTime, total));
  return Math.floor((elapsed / total) * 100);
}

/** rate per second -> "X.XX USDC/mo" */
export function rateToMonthly(ratePerSecond: bigint | string): string {
  const r = typeof ratePerSecond === 'bigint' ? ratePerSecond : BigInt(ratePerSecond);
  const monthly = r * BigInt(2592000); // 30 * 24 * 3600
  return formatUSDC(monthly);
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export const CATEGORIES = [
  { value: 'payroll', label: 'Payroll', color: 'var(--stream-blue)' },
  { value: 'subscription', label: 'Subscription', color: 'var(--stream-purple)' },
  { value: 'retainer', label: 'Retainer', color: 'var(--stream-teal)' },
  { value: 'grant', label: 'Grant', color: 'var(--success)' },
];

export function categoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? 'var(--muted)';
}
