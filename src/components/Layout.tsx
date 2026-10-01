import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  LayoutDashboard, ArrowRightLeft, Plus, History,
  Settings, Droplets, Sun, Moon, Menu, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from './Footer';
import { useTheme } from '@/lib/theme';

type View = 'dashboard' | 'streams' | 'create' | 'history' | 'settings';

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={18} />, description: 'Overview & stats' },
  { id: 'streams',   label: 'Streams',    icon: <ArrowRightLeft size={18} />,  description: 'Manage streams'   },
  { id: 'create',    label: 'New Stream', icon: <Plus size={18} />,             description: 'Start streaming'  },
  { id: 'history',   label: 'History',    icon: <History size={18} />,          description: 'All transactions'  },
  { id: 'settings',  label: 'Settings',   icon: <Settings size={18} />,         description: 'Wallet & budgets' },
];

const PAGE_TITLES: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard',   subtitle: 'Your streaming overview' },
  streams:   { title: 'Streams',     subtitle: 'Active & historical streams' },
  create:    { title: 'New Stream',  subtitle: 'Configure and deploy a USDC stream' },
  history:   { title: 'History',     subtitle: 'Complete transaction record' },
  settings:  { title: 'Settings',    subtitle: 'Wallet, contract & budgets' },
};

interface LayoutProps {
  view: View;
  onNav: (v: View) => void;
  children: React.ReactNode;
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover-surface focus:outline-none focus-visible:ring-2"
      style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface-muted)' }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Layout({ view, onNav, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = PAGE_TITLES[view];

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-transform duration-200',
          /* desktop: always visible at 72px collapsed or 260px expanded */
          'lg:translate-x-0 lg:w-64',
          mobileOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72',
        )}
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(24px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo / brand */}
        <div
          className="flex items-center gap-3 px-5 py-5 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <Droplets size={17} color="white" />
          </div>
          <div className="min-w-0">
            <p className="display font-bold text-base leading-none truncate" style={{ color: 'var(--ink)' }}>
              StreamVault
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--subtle)' }}>
              USDC Streaming
            </p>
          </div>
        </div>

        {/* Nav section label */}
        <p
          className="px-5 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--subtle)' }}
        >
          Navigation
        </p>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNav(item.id); setMobileOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                  isActive ? 'text-white' : 'hover-surface',
                )}
                style={
                  isActive
                    ? { background: 'var(--accent)', color: 'white' }
                    : { color: 'var(--muted)' }
                }
              >
                <span className={cn('shrink-0 transition-transform', !isActive && 'group-hover:scale-110')}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom: network + version */}
        <div className="px-4 py-4 border-t shrink-0 space-y-3" style={{ borderColor: 'var(--border)' }}>
          {/* Network badge */}
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Arc Testnet</span>
            </div>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: 'var(--accent)', color: 'white' }}>
              LIVE
            </span>
          </div>
          <p className="text-[11px] text-center" style={{ color: 'var(--subtle)' }}>
            USDC · Sub-second finality
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 backdrop-blur-sm lg:hidden"
          style={{ background: 'var(--overlay)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main area ─────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">

        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 lg:px-8 h-16 border-b shrink-0"
          style={{
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Left: mobile hamburger + page title */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-1.5 rounded-xl hover-surface shrink-0"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              style={{ color: 'var(--ink)', border: '1px solid var(--border)' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Page title — hidden on mobile to save space */}
            <div className="hidden sm:block min-w-0">
              <h1 className="display font-bold text-lg leading-none truncate" style={{ color: 'var(--ink)' }}>
                {page.title}
              </h1>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--subtle)' }}>
                {page.subtitle}
              </p>
            </div>
          </div>

          {/* Right: theme toggle + connect */}
          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <ConnectKitButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-5 lg:px-8 py-6 lg:py-8 w-full max-w-[1440px] mx-auto">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}

export type { View };
