# StreamVault — Design System

---

## Philosophy

StreamVault uses a **glassmorphism + dark-safe layered surface** system. Cards float above gradient backgrounds with subtle blur and translucency. The palette skews dark-blue-navy in both light and dark modes, with a blue accent that communicates authority and trust for a financial product.

Design rules:
- Semantic tokens only in components — no raw hex values for theme-sensitive colors
- Dark mode is first-class, not an afterthought
- Typography hierarchy is tight: `display` font (Space Grotesk) for headings, system sans for body
- Whitespace is generous; information density is deliberate
- Interactive states are always visible (hover, focus, active, disabled)

---

## Color Tokens (CSS Variables)

All tokens live in `src/index.css` under `:root` (light) and `.dark` (dark).

### Background & Surface

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg` | `#f6f7fb` | `#0c1220` | Page background |
| `--bg-gradient` | blue-white linear | dark navy linear | Full-page gradient |
| `--surface` | `rgba(255,255,255,0.80)` | `rgba(22,32,52,0.85)` | Glass card background |
| `--surface-strong` | `rgba(255,255,255,0.96)` | `rgba(26,38,60,0.95)` | Solid card / modal |
| `--surface-muted` | `#f1f3f8` | `#111827` | Input backgrounds, subtle areas |
| `--surface-hover` | `rgba(0,0,0,0.04)` | `rgba(255,255,255,0.05)` | Hover state overlay |
| `--sidebar-bg` | `rgba(255,255,255,0.92)` | `rgba(10,18,32,0.95)` | Sidebar panel |
| `--topbar-bg` | `rgba(255,255,255,0.85)` | `rgba(10,18,32,0.90)` | Topbar panel |
| `--overlay` | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.60)` | Modal/drawer backdrop |

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--ink` | `#0f1f3d` | `#e8f0ff` | Primary text |
| `--ink-2` | `#2d3d5a` | `#c0d0ee` | Secondary text |
| `--muted` | `#5a6a82` | `#7a90b0` | Tertiary / label text |
| `--subtle` | `#8a96ac` | `#4d6480` | Placeholder, hint text |

### Borders

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--border` | `rgba(15,31,61,0.10)` | `rgba(255,255,255,0.08)` | Default border |
| `--border-strong` | `rgba(15,31,61,0.22)` | `rgba(255,255,255,0.15)` | Focused/active border |

### Brand & Accent

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--accent` | `#122d45` | `#3b82f6` | Primary action color |
| `--accent-hover` | `#1a4a78` | `#60a5fa` | Hover state of accent |
| `--focus` | `#85b1ed` | `#93b4d8` | Focus ring |

### Semantic Status

| Token | Color | Usage |
|---|---|---|
| `--success` | `#1a8047` | Positive states, active streams |
| `--warn` | `#c47a0a` | Warning states, paused streams |
| `--danger` | `#ba2b4c` | Error states, cancelled streams |
| `--stream-blue` | `#2563eb` | Stream-specific accent |
| `--stream-purple` | `#7c3aed` | Alternative stream accent |

---

## Typography

### Fonts

| Font | Variable | Usage |
|---|---|---|
| Space Grotesk | `.display` class | All headings, brand name, numbers |
| System sans-serif | body default | All body text, labels, inputs |
| `font-mono` / `.mono` | monospace | Addresses, contract hashes, tx IDs |

**Load:** Space Grotesk is loaded via Google Fonts in `index.html`.

### Scale

| Class | Size | Weight | Usage |
|---|---|---|---|
| `text-3xl display` | 30px | 700 | Dashboard stat numbers |
| `text-2xl display` | 24px | 700 | Page titles |
| `text-xl display` | 20px | 600 | Section headings |
| `text-lg display` | 18px | 700 | Topbar page title |
| `text-base` | 16px | 400/500 | Body text |
| `text-sm` | 14px | 400/500 | Secondary text, card content |
| `text-xs` | 12px | 400/500 | Labels, hints, footer |
| `text-[11px]` | 11px | 400 | Micro labels, sidebar subtitle |
| `text-[10px]` | 10px | 600 | Section labels (uppercase tracking) |

---

## Component Patterns

### Glass Card

```tsx
<div
  className="glass-card p-5"
  // glass-card is defined in index.css:
  // background: var(--surface)
  // backdrop-filter: blur(12px)
  // border: 1px solid var(--border)
  // border-radius: 1rem (16px)
>
```

### Hover Surface

```tsx
className="hover-surface"
// Adds: hover:bg-[var(--surface-hover)]
// Safe in both light and dark — never hover:bg-black/5
```

### Action Button (Primary)

```tsx
<button
  style={{ background: 'var(--accent)', color: 'white' }}
  className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
>
```

### Action Button (Destructive)

```tsx
<button
  style={{ background: 'var(--danger)', color: 'white' }}
  className="px-4 py-2 rounded-xl text-sm font-semibold"
>
```

### Status Badge

```tsx
const STATUS_STYLES = {
  active:    { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' },
  paused:    { bg: 'color-mix(in srgb, var(--warn) 12%, transparent)',    color: 'var(--warn)'    },
  cancelled: { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)',  color: 'var(--danger)'  },
  completed: { bg: 'color-mix(in srgb, var(--muted) 12%, transparent)',   color: 'var(--muted)'   },
};
```

### Input Field

```tsx
<input
  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
  style={{
    background: 'var(--surface-muted)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
  }}
  // Focus:
  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
  onBlur={(e)  => (e.currentTarget.style.borderColor = 'var(--border)')}
/>
```

---

## Layout System

### Sidebar
- Expanded: `260px`
- Collapsed (icon rail): `60px`
- Height: `h-16` (64px) for logo section to align with topbar border
- State persisted to `localStorage` key `sv-sidebar`

### Topbar
- Height: `h-16` (64px, always fixed)
- `sticky top-0 z-20`
- Contains: sidebar toggle, page title, theme toggle, ConnectKit button

### Content Area
- `max-w-[1440px] mx-auto`
- Padding: `px-5 lg:px-8 py-6 lg:py-8`
- Breakpoints: `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)

### Grid Patterns

| Context | Grid |
|---|---|
| Dashboard stat cards | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4` |
| Dashboard stream cards | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` |
| Stream list | `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` |
| Create stream (form + preview) | `grid-cols-1 xl:grid-cols-[1fr_380px]` |
| Settings | `grid-cols-1 xl:grid-cols-[380px_1fr]` |

---

## Theme Toggle

Located in topbar (right of ConnectKit). Sun icon in dark mode, Moon icon in light mode.

```tsx
// src/lib/theme.tsx
const { theme, toggleTheme } = useTheme();
// theme: 'light' | 'dark'
// toggleTheme: () => void
```

Theme is applied by adding/removing the `.dark` class on `<html>`. CSS variables under `.dark {}` override `:root {}`.

**Flash prevention:** `index.html` has an inline `<script>` that reads `localStorage.getItem('sv-theme')` and sets `.dark` on `<html>` before React hydrates.

---

## Accessibility

- All interactive elements have `aria-label` when icon-only
- Focus rings use `focus-visible:ring-2` with `--focus` color
- Keyboard navigation: all buttons, nav items, and form controls are reachable
- Color contrast: text tokens chosen to pass WCAG AA in both themes
- Status colors supplement (not replace) text labels — never color-only indicators

---

## Dark Mode Rules

1. **Never use `hover:bg-black/5`** — use `hover-surface` class
2. **Never use raw rgba with white/black** for theme-sensitive surfaces — use CSS vars
3. **`color-mix(in srgb, var(--token) N%, transparent)`** for tinted backgrounds
4. **Footer** has its own fixed dark palette (always dark, not theme-responsive) — this is intentional; do not add light mode overrides to footer styles
5. **Charts and status colors** are brand colors — they do not change between themes

---

## Category Colors

Stream categories use a fixed palette (brand colors, not theme-responsive):

| Category | Color |
|---|---|
| payroll | `#2563eb` (blue) |
| subscription | `#7c3aed` (purple) |
| grant | `#059669` (green) |
| retainer | `#d97706` (amber) |
| other | `#64748b` (slate) |

These are rendered as left-border color strips on stream cards.
