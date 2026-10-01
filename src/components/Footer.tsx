import { useState } from 'react';
import { Droplets, Github, Twitter, ExternalLink, Zap, Shield, ArrowRightLeft, X } from 'lucide-react';

const CONTRACT = '0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8';
const EXPLORER_URL = `https://explorer.testnet.arc.io/address/${CONTRACT}`;

type LegalDoc = 'terms' | 'privacy' | 'disclaimer' | null;

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
};

const FEATURES = [
  { icon: <Zap size={14} />, label: 'Sub-second finality on Arc' },
  { icon: <Shield size={14} />, label: 'Audited smart contract' },
  { icon: <ArrowRightLeft size={14} />, label: 'Per-second USDC streaming' },
];

/* ── Legal content ─────────────────────────────────────── */

const LEGAL: Record<NonNullable<LegalDoc>, { title: string; body: React.ReactNode }> = {
  terms: {
    title: 'Terms of Use',
    body: (
      <div className="space-y-5 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        <p style={{ color: 'var(--muted)' }}>Last updated: October 2026</p>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>1. Acceptance</h3>
          <p>By accessing or using StreamVault ("the App"), you agree to be bound by these Terms of Use. If you do not agree, do not use the App.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>2. Nature of the Service</h3>
          <p>StreamVault is a non-custodial, open-source interface that interacts with a smart contract deployed on the Arc Testnet blockchain. The App does not hold, control, or manage user funds. All transactions are executed directly by your wallet and governed by immutable on-chain code.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>3. Testnet Only</h3>
          <p>StreamVault currently operates exclusively on Arc Testnet. Testnet tokens have no real monetary value. You must not use the App with real funds, assets of value, or on any production/mainnet environment without independent review and your own due diligence.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>4. User Responsibilities</h3>
          <p>You are solely responsible for: (a) the security of your wallet and private keys; (b) verifying recipient addresses before creating a stream; (c) understanding that blockchain transactions are irreversible; (d) compliance with all applicable laws in your jurisdiction.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>5. No Warranties</h3>
          <p>The App is provided "as is" and "as available" without warranty of any kind. We make no guarantee that the App will be error-free, uninterrupted, or that smart contract interactions will always succeed.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>6. Limitation of Liability</h3>
          <p>To the maximum extent permitted by law, StreamVault and its contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of or inability to use the App.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>7. Changes</h3>
          <p>These terms may be updated at any time. Continued use of the App after changes constitutes acceptance of the updated terms.</p>
        </section>
      </div>
    ),
  },
  privacy: {
    title: 'Privacy Policy',
    body: (
      <div className="space-y-5 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        <p style={{ color: 'var(--muted)' }}>Last updated: October 2026</p>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>1. Data We Collect</h3>
          <p>StreamVault collects minimal data necessary to operate the service:</p>
          <ul className="list-disc list-inside mt-2 space-y-1" style={{ color: 'var(--muted)' }}>
            <li>Wallet addresses you connect or enter (stored off-chain to index stream records)</li>
            <li>Stream metadata you submit (label, category, recipient, rate) stored in our database</li>
            <li>Anonymous page-view analytics via Vercel Analytics (no personal identifiers)</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>2. Data We Do NOT Collect</h3>
          <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--muted)' }}>
            <li>Private keys, seed phrases, or wallet passwords — ever</li>
            <li>Email addresses or any personally identifiable information</li>
            <li>IP addresses tied to wallet addresses</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>3. On-chain Data</h3>
          <p>Blockchain transactions are publicly visible by design. Any transaction you submit through StreamVault is permanently recorded on the Arc Testnet public ledger. We have no ability to delete or modify on-chain data.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>4. Third-party Services</h3>
          <p>We use the following third-party services: Vercel (hosting and analytics), Neon/PostgreSQL (database). Each service has its own privacy policy. We do not sell your data to any third party.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>5. Data Retention</h3>
          <p>Off-chain stream records are retained to provide the service. You may request deletion of off-chain records associated with your wallet address by opening an issue on our GitHub repository.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>6. Contact</h3>
          <p>For privacy-related questions, open an issue at{' '}
            <a
              href="https://github.com/haileva/streamvault/issues"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-hover)' }}
            >
              github.com/haileva/streamvault
            </a>.
          </p>
        </section>
      </div>
    ),
  },
  disclaimer: {
    title: 'Testnet Disclaimer',
    body: (
      <div className="space-y-5 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
        <div
          className="p-4 rounded-xl text-sm font-semibold"
          style={{ background: 'color-mix(in srgb, var(--warn) 12%, transparent)', color: 'var(--warn)', border: '1px solid color-mix(in srgb, var(--warn) 25%, transparent)' }}
        >
          ⚠ StreamVault is a testnet application. All tokens are worthless test tokens.
        </div>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>1. Testnet Environment</h3>
          <p>StreamVault operates exclusively on Arc Testnet. The USDC used in this application is testnet USDC — it has no monetary value and cannot be exchanged for real currency or assets of any kind.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>2. No Real Value</h3>
          <p>Testnet tokens, including testnet USDC, are provided solely for testing and development purposes. Do not treat any balance or transaction in StreamVault as having real-world financial significance.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>3. Experimental Software</h3>
          <p>The smart contract and application code are experimental and have not been audited for mainnet use. The contract has undergone a basic security review for testnet purposes only. It may contain bugs, vulnerabilities, or behave unexpectedly.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>4. Network Instability</h3>
          <p>Testnets are subject to resets, downtime, and instability. Stream data, balances, and transaction history may be lost without notice if the Arc Testnet is reset.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>5. Not Financial Advice</h3>
          <p>Nothing in this application constitutes financial, legal, or investment advice. StreamVault is a developer tool and proof of concept.</p>
        </section>

        <section>
          <h3 className="font-semibold mb-1" style={{ color: 'var(--ink)' }}>6. Use at Own Risk</h3>
          <p>By using StreamVault on testnet you acknowledge these conditions and agree to use the application entirely at your own risk.</p>
        </section>
      </div>
    ),
  },
};

/* ── Modal ─────────────────────────────────────────────── */

function LegalModal({ doc, onClose }: { doc: NonNullable<LegalDoc>; onClose: () => void }) {
  const { title, body } = LEGAL[doc];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-xl max-h-[85vh] rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="display font-bold text-lg" style={{ color: 'var(--ink)' }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover-surface"
            style={{ color: 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {body}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 shrink-0 flex justify-end"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--accent)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Footer ────────────────────────────────────────────── */

export function Footer() {
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(null);

  const LEGAL_LINKS: { label: string; doc: NonNullable<LegalDoc> }[] = [
    { label: 'Terms of Use', doc: 'terms' },
    { label: 'Privacy Policy', doc: 'privacy' },
    { label: 'Testnet Disclaimer', doc: 'disclaimer' },
  ];

  return (
    <>
      {legalDoc && <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />}

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
              <span className="display text-lg font-bold tracking-tight" style={{ color: '#e8f0ff' }}>
                StreamVault
              </span>
            </div>

            <p className="text-sm leading-relaxed" style={{ color: '#6b82a0' }}>
              Programmable USDC payroll and subscription streaming. Funds flow
              per-second, onchain — no intermediaries, no delays.
            </p>

            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-2 text-xs" style={{ color: '#4d6a8a' }}>
                  <span style={{ color: '#3b82f6' }}>{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 pt-1">
              {[
                { href: 'https://github.com/haileva/streamvault', icon: <Github size={16} />, label: 'GitHub' },
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

          {/* Product + Resources link columns */}
          {(
            [
              { title: 'Product', items: LINKS.product },
              { title: 'Resources', items: LINKS.resources },
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

          {/* Legal column — buttons that open modals */}
          <div className="md:col-span-2 xl:col-span-2 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#3b82f6' }}>
              Legal
            </p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((item) => (
                <li key={item.doc}>
                  <button
                    onClick={() => setLegalDoc(item.doc)}
                    className="text-sm text-left transition-colors"
                    style={{ color: '#6b82a0' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#93b4d8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#6b82a0')}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

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
          <button
            onClick={() => setLegalDoc('disclaimer')}
            className="text-xs transition-colors"
            style={{ color: '#334a63' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#4d6a8a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#334a63')}
          >
            Testnet only — not for real funds
          </button>
        </div>
      </footer>
    </>
  );
}
