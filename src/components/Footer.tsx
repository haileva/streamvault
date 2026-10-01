import { Droplets, Github, Twitter, ExternalLink, Zap, Shield, ArrowRightLeft } from 'lucide-react';

const CONTRACT = '0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8';
const EXPLORER_URL = `https://explorer.testnet.arc.io/address/${CONTRACT}`;

const LINKS = {
  product: [
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Streams', href: '#streams' },
    { label: 'Create Stream', href: '#create' },
    { label: 'History', href: '#history' },
  ],
  resources: [
    { label: 'Arc Testnet', href: 'https://arc.io', external: true },
    { label: 'Circle USDC', href: 'https://circle.com/usdc', external: true },
    { label: 'Smart Contract', href: EXPLORER_URL, external: true },
    { label: 'USDC Faucet', href: 'https://faucet.circle.com', external: true },
  ],
  legal: [
    { label: 'Terms of Use', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Testnet Disclaimer', href: '#' },
  ],
};

const FEATURES = [
  { icon: <Zap size={14} />, label: 'Sub-second finality on Arc' },
  { icon: <Shield size={14} />, label: 'Audited smart contract' },
  { icon: <ArrowRightLeft size={14} />, label: 'Per-second USDC streaming' },
];

export function Footer() {
  return (
    <footer
      className="mt-16 rounded-2xl overflow-hidden border"
      style={{
        background: 'linear-gradient(160deg, #0b1a2e 0%, #0f2040 60%, #0d1a30 100%)',
        borderColor: 'rgba(255,255,255,0.07)',
      }}
    >
      {/* Top section */}
      <div className="px-8 pt-10 pb-8 grid grid-cols-1 md:grid-cols-12 gap-8 xl:gap-10">
        {/* Brand col */}
        <div className="md:col-span-4 xl:col-span-4 space-y-5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl"
              style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(37,99,235,0.4)' }}
            >
              <Droplets size={17} color="#60a5fa" />
            </div>
            <span
              className="display text-lg font-bold tracking-tight"
              style={{ color: '#e8f0ff' }}
            >
              StreamVault
            </span>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: '#6b82a0' }}>
            Programmable USDC payroll and subscription streaming. Funds flow
            per-second, onchain — no intermediaries, no delays.
          </p>

          {/* Feature pills */}
          <ul className="space-y-2">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2 text-xs" style={{ color: '#4d6a8a' }}>
                <span style={{ color: '#3b82f6' }}>{f.icon}</span>
                {f.label}
              </li>
            ))}
          </ul>

          {/* Social */}
          <div className="flex items-center gap-3 pt-1">
            {[
              { href: 'https://github.com', icon: <Github size={16} />, label: 'GitHub' },
              { href: 'https://twitter.com', icon: <Twitter size={16} />, label: 'Twitter' },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#6b82a0',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#93b4d8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b82a0')}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {(
          [
            { title: 'Product', items: LINKS.product },
            { title: 'Resources', items: LINKS.resources },
            { title: 'Legal', items: LINKS.legal },
          ] as const
        ).map((col) => (
          <div key={col.title} className="md:col-span-2 xl:col-span-2 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#3b82f6' }}>
              {col.title}
            </p>
            <ul className="space-y-2.5">
              {col.items.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target={'external' in item && item.external ? '_blank' : undefined}
                    rel={'external' in item && item.external ? 'noopener noreferrer' : undefined}
                    className="group flex items-center gap-1 text-sm transition-colors"
                    style={{ color: '#6b82a0' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#93b4d8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6b82a0')}
                  >
                    {item.label}
                    {'external' in item && item.external && (
                      <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>{/* end grid */}

      {/* Divider */}
      <div className="mx-8" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Bottom bar */}
      <div className="px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs" style={{ color: '#4d6a8a' }}>
          © {new Date().getFullYear()} StreamVault. Built on{' '}
          <a
            href="https://arc.io"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: '#3b82f6' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3b82f6')}
          >
            Arc
          </a>{' '}
          with USDC as native gas.
        </p>
        <p className="text-xs" style={{ color: '#334a63' }}>
          Testnet only — not for real funds
        </p>
      </div>
    </footer>
  );
}
