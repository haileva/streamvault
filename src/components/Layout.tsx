import { useState, useEffect } from 'react';
import { ConnectKitButton } from 'connectkit';
import {
  LayoutDashboard, ArrowRightLeft, Plus, History,
  Settings, Droplets, Sun, Moon, PanelLeftClose, PanelLeftOpen, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from './Footer';
import { useTheme } from '@/lib/theme';

type View = 'dashboard' | 'streams' | 'create' | 'history' | 'settings' | 'docs';

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={18} />, description: 'Overview & stats'  },
  { id: 'streams',   label: 'Streams',    icon: <ArrowRightLeft size={18} />,  description: 'Manage streams'    },
  { id: 'create',    label: 'New Stream', icon: <Plus size={18} />,            description: 'Start streaming'   },
  { id: 'history',   label: 'History',    icon: <History size={18} />,         description: 'All transactions'  },
  { id: 'settings',  label: 'Settings',   icon: <Settings size={18} />,        description: 'Wallet & budgets'  },
  { id: 'docs',      label: 'Docs',       icon: <BookOpen size={18} />,        description: 'Project docs'      },
];

const PAGE_TITLES: Record<View, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard',   subtitle: 'Your streaming overview' },
  streams:   { title: 'Streams',     subtitle: 'Active & historical streams' },
  create:    { title: 'New Stream',  subtitle: 'Configure and deploy a USDC stream' },
  history:   { title: 'History',     subtitle: 'Complete transaction record' },
  settings:  { title: 'Settings',    subtitle: 'Wallet, contract & budgets' },
  docs:      { title: 'Docs',        subtitle: 'Project documentation' },
};

// Sidebar widths
const SIDEBAR_EXPANDED = 260;   // px — full sidebar
const SIDEBAR_COLLAPSED = 60;   // px — icon-only rail

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
  // ── Sidebar state ───────────────────────────────────────
  // Desktop: expanded (true) or collapsed to icon rail (false)
  const [expanded, setExpanded] = useState<boolean>(() => {
    try { return localStorage.getItem('sv-sidebar') !== 'collapsed'; }
    catch { return true; }
  });

  // Mobile overlay
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist desktop sidebar state
  useEffect(() => {
    try { localStorage.setItem('sv-sidebar', expanded ? 'expanded' : 'collapsed'); }
    catch { /* ignore */ }
  }, [expanded]);

  // Close mobile overlay on resize to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const page = PAGE_TITLES[view];
  const sidebarW = expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r',
          'transition-[width,transform] duration-200 ease-in-out',
          // mobile: always 272px wide, slides in/out
          'w-[272px] lg:w-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          // desktop width controlled by JS state; mobile width overridden by Tailwind class above
          width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarW}px` : undefined,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(24px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo / brand — exact same height as topbar h-16 so border lines up */}
        <div
          className="flex items-center gap-3 px-3 h-16 border-b shrink-0 overflow-hidden"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Icon — always visible */}
          <div
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{ background: 'var(--accent)', width: 36, height: 36 }}
          >
            <Droplets size={17} color="white" />
          </div>

          {/* Label — hidden when collapsed on desktop */}
          <div
            className={cn(
              'min-w-0 transition-[opacity,width] duration-200',
              expanded ? 'opacity-100 w-auto' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden',
            )}
          >
            <p className="display font-bold text-base leading-none whitespace-nowrap" style={{ color: 'var(--ink)' }}>
              StreamVault
            </p>
            <p className="text-[11px] mt-0.5 whitespace-nowrap" style={{ color: 'var(--subtle)' }}>
              USDC Streaming
            </p>
          </div>
        </div>

        {/* Nav section label — hidden when collapsed */}
        <p
          className={cn(
            'px-5 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest transition-[opacity,height] duration-200',
            expanded ? 'opacity-100 h-auto' : 'lg:opacity-0 lg:h-0 lg:overflow-hidden lg:pt-3 lg:pb-0',
          )}
          style={{ color: 'var(--subtle)' }}
        >
          Navigation
        </p>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden pt-2">
          {NAV.map((item) => {
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNav(item.id); setMobileOpen(false); }}
                title={!expanded ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all group relative',
                  expanded ? 'px-3 py-2.5' : 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5',
                  isActive ? 'text-white' : 'hover-surface',
                )}
                style={
                  isActive
                    ? { background: 'var(--accent)', color: 'white' }
                    : { color: 'var(--muted)' }
                }
              >
                {/* Icon */}
                <span className={cn('shrink-0 transition-transform', !isActive && 'group-hover:scale-110')}>
                  {item.icon}
                </span>

                {/* Label — hidden when collapsed on desktop */}
                <span
                  className={cn(
                    'truncate transition-[opacity,width] duration-200',
                    expanded ? 'opacity-100' : 'lg:opacity-0 lg:w-0 lg:overflow-hidden',
                  )}
                >
                  {item.label}
                </span>

                {/* Active dot — only when expanded */}
                {isActive && expanded && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                )}

                {/* Tooltip for collapsed state */}
                {!expanded && (
                  <span
                    className={cn(
                      'absolute left-full ml-3 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap',
                      'pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50',
                      'hidden lg:block',
                    )}
                    style={{
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom: network badge */}
        <div className="px-3 py-4 border-t shrink-0 overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {expanded ? (
            <div
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--ink-2)' }}>Arc Testnet</span>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'var(--accent)', color: 'white' }}>
                LIVE
              </span>
            </div>
          ) : (
            /* Collapsed: just the ping dot centered */
            <div className="hidden lg:flex justify-center">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </div>
          )}
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
      <div
        className="sidebar-main-area flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-in-out"
        style={{ marginLeft: `${sidebarW}px` }}
      >

        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-5 lg:px-6 h-16 border-b shrink-0"
          style={{
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Left: sidebar toggle + page title */}
          <div className="flex items-center gap-3 min-w-0">

            {/* Desktop sidebar toggle */}
            <button
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl hover-surface shrink-0 focus:outline-none focus-visible:ring-2 transition-colors"
              onClick={() => setExpanded((e) => !e)}
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
              style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'var(--surface-muted)' }}
            >
              {expanded ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl hover-surface shrink-0"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              style={{ border: '1px solid var(--border)', color: 'var(--ink)', background: 'var(--surface-muted)' }}
            >
              {mobileOpen
                ? <PanelLeftClose size={17} />
                : <PanelLeftOpen size={17} />}
            </button>

            {/* Page title */}
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
