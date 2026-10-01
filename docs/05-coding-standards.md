# StreamVault — Coding Standards

---

## General Rules

1. **Read before editing.** Always read the file before using `edit_file`. Never overwrite with a full rewrite when a diff will do.
2. **No hardcoded values in UI.** Import chain IDs, USDC addresses, contract addresses, and decimal counts from `src/onchain-facts.ts` and `src/onchain-money.ts`.
3. **No raw hex colors in components** for theme-sensitive values. Use `var(--token)` CSS variables.
4. **Never `hover:bg-black/5`** — use `hover-surface` class (dark-safe).
5. **Semantic HTML.** Use `<button>`, `<nav>`, `<aside>`, `<header>`, `<main>`, `<footer>` correctly.
6. **TypeScript strict.** No `any`. Use proper types for all props, state, and API responses.
7. **Error handling.** Never swallow errors silently. Log with `console.error` at minimum; show user-facing toast on actionable failures.

---

## File & Folder Structure

```
src/
  App.tsx               # Thin composition root — view routing only
  main.tsx              # Providers, entry point — do not add business logic here
  config.ts             # wagmi config — do not modify unless adding chains
  index.css             # Tailwind directives + CSS variables — never delete directives
  onchain-facts.ts      # Generated — DO NOT EDIT, import from here
  onchain-money.ts      # Generated — DO NOT EDIT, import from here
  onchain-wait.ts       # Generated — DO NOT EDIT, import from here
  components/           # Shared components (Layout, StreamCard, Footer, etc.)
  views/                # One file per page view
  lib/                  # api.ts, utils.ts, theme.tsx, contracts.ts
```

**Rule:** Any feature with more than one logical section belongs in its own file under `components/` or `views/`. `App.tsx` stays a thin router.

---

## TypeScript Patterns

### Props and State

```ts
// Always type props explicitly
interface StreamCardProps {
  stream: StreamRecord;
  onRefresh: () => void;
}

// Use union types for known string sets
type StreamStatus = 'active' | 'paused' | 'cancelled' | 'completed';
type StreamCategory = 'payroll' | 'subscription' | 'grant' | 'retainer' | 'other';
```

### API Response Types

All API response shapes are defined in `src/lib/api.ts`. Import from there:

```ts
import { type StreamRecord, type BudgetEnvelope, api } from '@/lib/api';
```

Never redefine shapes inline in views or components.

### Async / Effects

```ts
// Pattern for data-fetch effects:
useEffect(() => {
  if (!address) return;
  setLoading(true);
  api.streams.list(address)
    .then(({ streams, total }) => {
      setStreams(streams);
      setTotal(total);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [address]);
```

Use `void` to explicitly discard promises when needed:
```ts
useEffect(() => {
  void fetchData();
}, [fetchData]);
```

---

## React Patterns

### Component Structure

```tsx
// 1. Imports
// 2. Types / interfaces
// 3. Constants (outside component)
// 4. Component function
//   a. Hooks (wagmi, state, effects)
//   b. Derived values
//   c. Event handlers
//   d. Early returns (loading, empty, error states)
//   e. Main render
```

### Loading States

Always show a loading skeleton or spinner — never a blank view:

```tsx
if (loading) return (
  <div className="flex items-center justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-2"
      style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
  </div>
);
```

### Empty States

Always show a helpful empty state with a CTA:

```tsx
if (streams.length === 0) return (
  <div className="text-center py-16 space-y-3">
    <p style={{ color: 'var(--muted)' }}>No streams yet.</p>
    <button onClick={() => onNav('create')} ...>Create your first stream</button>
  </div>
);
```

### Error Boundary Pattern

Catch API errors and show contextual messages. Never show raw error objects to users.

---

## Onchain Patterns

### Always import facts, never type them

```ts
// WRONG
const USDC = '0x3600000000000000000000000000000000000000';
const DECIMALS = 6;

// CORRECT
import { getUsdc, requireChain } from '@/onchain-facts';
const usdc = getUsdc(chainId);
```

### All decimal math through onchain-money

```ts
// WRONG
const amount = BigInt(value) * 10n ** 6n;

// CORRECT
import { parseUsdc, formatUsdc } from '@/onchain-money';
const amount = parseUsdc(value);
const display = formatUsdc(amount);
```

### Transaction state machine

```ts
// WRONG — writing your own polling loop
// CORRECT
import { waitForSuccessfulTransaction } from '@/onchain-wait';
await waitForSuccessfulTransaction(txHash, publicClient);
```

### useWriteContract pattern

```ts
const { writeContract, isPending } = useWriteContract();

// Call:
writeContract({
  address: STREAM_VAULT_ADDRESS,
  abi: STREAM_VAULT_ABI,
  functionName: 'withdrawFromStream',
  args: [BigInt(streamId)],
});

// Show pending state using isPending
```

---

## Styling Rules

### Tailwind Usage

- Use Tailwind utility classes for layout, spacing, and typography
- Use `style={{ }}` props for CSS variable references (Tailwind cannot interpolate runtime CSS vars)
- Never add new CSS files — extend `index.css` if a global class is needed

### Color Rules Summary

| Situation | Use |
|---|---|
| Theme-sensitive background | `var(--surface)`, `var(--surface-muted)` |
| Theme-sensitive text | `var(--ink)`, `var(--muted)`, `var(--subtle)` |
| Hover on any surface | `hover-surface` class |
| Status tint background | `color-mix(in srgb, var(--success/warn/danger) 12%, transparent)` |
| Brand/status text | `var(--success)`, `var(--warn)`, `var(--danger)`, `var(--accent)` |
| Footer (always dark) | Fixed hex values — footer is always dark regardless of theme |
| Category color strip | Fixed hex from `categoryColor()` util |

### Class Naming Conventions

- Utility classes: standard Tailwind
- Custom global classes: `.glass-card`, `.display`, `.mono`, `.hover-surface` (defined in `index.css`)
- No BEM, no CSS modules — Tailwind-first

---

## Backend / API Standards

### Route Handlers

```ts
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT ...', [params]);
    res.json({ data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error('[streams] GET /', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

Rules:
- Always `try/catch` in async route handlers
- Log errors with a prefix `[routeName] METHOD /path`
- Never expose raw DB error messages to clients — return `{ error: 'Internal server error' }`
- Use `res.status(400)` for client errors, `res.status(500)` for server errors

### Database Queries

- Always use parameterized queries (`$1`, `$2`, etc.) — never string interpolation
- Use `pool.query()` for one-off queries; prefer named queries for hot paths
- Schema changes go in `server/db.ts` `initSchema()` — never modify the DB outside this function

### Environment Variables

- Frontend public values: `VITE_` prefix (accessible via `import.meta.env.VITE_*`)
- Backend-only secrets: no prefix (accessible via `process.env.*`)
- Never hardcode a connection string, address, or key in source code

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | `StreamCard`, `CreateStream` |
| Hooks | camelCase with `use` prefix | `useTheme`, `useStreamBalance` |
| Utility functions | camelCase | `formatUSDC`, `rateToMonthly` |
| Constants | UPPER_SNAKE_CASE | `STREAM_VAULT_ADDRESS`, `PAGE_SIZE` |
| CSS variables | kebab-case with `--` | `--surface-muted`, `--stream-blue` |
| API endpoints | kebab-case | `/budget-envelopes`, `/stream-events` |
| DB tables | snake_case | `budget_envelopes`, `indexer_state` |
| DB columns | snake_case | `stream_id`, `rate_per_second` |
| Files | PascalCase for components, camelCase for utils | `StreamCard.tsx`, `utils.ts` |

---

## Lint & Type Checks

Run before every commit:

```bash
bun run check   # runs oxlint + tsc --noEmit
```

Rules:
- **0 errors** required
- Warnings allowed only for pre-approved patterns (see `.oxlintrc.json`)
- Never suppress errors with `// eslint-disable-line` unless truly a false positive — document why
- The `react/set-state-in-effect` rule is set to `warn` (not error) — idiomatic data-fetch effects use this pattern legitimately

---

## Forbidden Patterns

```ts
// Never use any
const data: any = response;

// Never use hover:bg-black/* in components
className="hover:bg-black/5"  // use hover-surface instead

// Never hardcode onchain addresses
const USDC = '0x3600...';

// Never write your own bigint decimal math
const amount = BigInt(val) * 10n ** 6n;

// Never push secrets to environment
console.log(process.env.DATABASE_URL);

// Never call .json() without checking response.ok
const data = await fetch(url).then(r => r.json()); // missing error check
// Correct:
const r = await fetch(url);
if (!r.ok) throw new Error(`HTTP ${r.status}`);
const data = await r.json();
```
