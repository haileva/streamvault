import { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { LayoutDashboard, ArrowRightLeft, Plus, History, Settings, Droplets, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from './Footer';
import { useTheme } from '@/lib/theme';

type View = 'dashboard' | 'streams' | 'create' | 'history' | 'settings';

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'streams', label: 'Streams', icon: <ArrowRightLeft size={18} /> },
  { id: 'create', label: 'New Stream', icon: <Plus size={18} /> },
  { id: 'history', label: 'History', icon: <History size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
];

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
      style={{
        border: '1px solid var(--border)',
        color: 'var(--muted)',
        background: 'var(--surface-muted)',
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Layout({ view, onNav, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh" style={{ background: 'var(--bg-gradient)' }}>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-60 border-r transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(24px)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <Droplets size={16} color="white" />
          </div>
          <span className="display text-base font-bold" style={{ color: 'var(--ink)' }}>
            StreamVault
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNav(item.id); setMobileOpen(false); }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                view === item.id ? 'text-white' : 'hover-surface',
              )}
              style={
                view === item.id
                  ? { background: 'var(--accent)', color: 'white' }
                  : { color: 'var(--muted)' }
              }
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--subtle)' }}>Network</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Arc Testnet</span>
          </div>
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

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col">
        {/* Topbar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-14 border-b"
          style={{
            background: 'var(--topbar-bg)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-1.5 rounded-lg hover-surface"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            style={{ color: 'var(--ink)' }}
          >
            <div className="space-y-1.5">
              <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
              <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
              <span className="block w-5 h-0.5 rounded-full" style={{ background: 'var(--ink)' }} />
            </div>
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ConnectKitButton />
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full">
          {children}
          <Footer />
        </main>
      </div>
    </div>
  );
}

export type { View };
