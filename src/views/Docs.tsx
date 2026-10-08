import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, ChevronRight, Hash, ExternalLink, Menu, X, Languages } from 'lucide-react';
import { renderMarkdown, extractHeadings, type Heading } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import {
  DOC_01_VI, DOC_02_VI, DOC_03_VI,
  DOC_04_VI, DOC_05_VI, DOC_06_VI,
} from '@/lib/docs-vi';

type Lang = 'en' | 'vi';

/* ─── Raw markdown content ─────────────────────────────────────── */

const DOC_01 = `# StreamVault — Project Overview

> Programmable USDC payroll and subscription streaming on Arc Testnet.

---

## What Is StreamVault?

StreamVault is a Web3 application that lets anyone stream USDC continuously — per second — to a recipient. A sender deposits USDC once, and it flows automatically to the recipient at a fixed rate until the stream ends, is paused, or is cancelled.

Think of it as a live payroll system, a subscription engine, or a grant disburser — all operating onchain without intermediaries or manual invoicing.

---

## Core Use Cases

| Use Case | How It Works |
|---|---|
| **Payroll** | Employer creates a stream to an employee wallet at a per-second salary rate. Funds flow continuously; employee withdraws anytime. |
| **Subscriptions** | Service provider sets a monthly rate converted to per-second. Subscriber funds the stream upfront. |
| **Freelance Retainer** | Client streams USDC to a contractor at an agreed daily/hourly rate. |
| **DAO Grants** | DAO treasury streams grant funding to a recipient over a vesting period. |
| **Revenue Sharing** | Protocol streams a percentage of collected fees to contributors in real time. |

---

## Key Features

### Onchain
- **Per-second USDC accrual** — the contract computes claimable balance at any timestamp
- **Pause / Resume** — sender can pause a stream; paused time is excluded from accrual
- **Cancel with pull-based payout** — cancel splits the deposit fairly; recipient's share goes into \`pendingWithdrawals\` to avoid blocklist-induced lockups
- **Recipient withdraws anytime** — no waiting for the stream to end
- **Audited** — three findings fixed before deploy (paused-time accrual, cancel bricking, fee-on-transfer accounting)
- **Deployed** — \`0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8\` on Arc Testnet

### Offchain
- **PostgreSQL backend** — streams, budget envelopes, onchain events, and an indexer cursor table persisted offchain for instant queries
- **Express REST API** — proxied through Vite, CRUD for streams, budget envelopes, and stats
- **Budget envelopes** — sender-side spend tracking per category

### Frontend
- **5-view SPA** — Dashboard, Streams, Create Stream, History, Settings
- **Light / Dark theme** — CSS variable-based, persisted to \`localStorage\`, no flash on load
- **Collapsible sidebar** — icon-only rail mode on desktop, slide-over on mobile
- **Full HD responsive** — \`max-w-[1440px]\` content, XL breakpoint grids

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS v3 |
| Web3 | wagmi v2, viem v2, ConnectKit |
| Backend | Express 5, Bun runtime |
| Database | PostgreSQL 18 (Docker) |
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin 5.x |
| Chain | Arc Testnet (Chain ID 5042002) |
| Token | USDC — \`0x3600000000000000000000000000000000000000\` |

---

## Network

| Property | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Native gas | USDC (18-decimal native view, 6-decimal ERC-20 view) |
| Finality | Sub-second |
| RPC | \`https://rpc.testnet.arc.io\` |
| Explorer | \`https://explorer.testnet.arc.io\` |

---

## Status

- Contract: **deployed and audited**
- Frontend: **production-ready**
- Backend: **running**
- Database: **migrated (all 5 tables live)**
- Security: **24/25 transitive vulnerabilities resolved**
`;

const DOC_02 = `# StreamVault — Architecture

---

## System Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   React SPA (Vite, port 5173)                               │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│   │Dashboard │  │ Streams  │  │  Create  │  │ History  │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│          │ wagmi/viem (RPC)        │ fetch /api/*           │
└──────────┼─────────────────────────┼────────────────────────┘
           │                         │ Vite proxy /api → :3001
           │                         ▼
           │               ┌──────────────────┐
           │               │  Express API      │
           │               │  server/index.ts  │
           │               │  port 3001        │
           │               └────────┬─────────┘
           │                        │ pg Pool
           │                        ▼
           │               ┌──────────────────┐
           │               │   PostgreSQL      │
           │               │   streamvault DB  │
           │               │   port 5432       │
           │               └──────────────────┘
           │
           │ RPC (Arc Testnet)
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  Arc Testnet Blockchain                       │
│                                                              │
│   StreamVault.sol                                            │
│   0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8                │
│                                                              │
│   USDC ERC-20                                                │
│   0x3600000000000000000000000000000000000000                │
└──────────────────────────────────────────────────────────────┘
\`\`\`

---

## Layers

### 1. Frontend (src/)

**Entry:** \`src/main.tsx\` — wraps the app in \`WagmiProvider\`, \`QueryClientProvider\`, \`ConnectKitProvider\`, \`ThemeProvider\`, and Sonner \`Toaster\`.

**Views** (\`src/views/\`):

| View | File | Purpose |
|---|---|---|
| Dashboard | \`Dashboard.tsx\` | Stats, active streams summary, CTA cards |
| Streams | \`Streams.tsx\` | Filterable, paginated stream card grid |
| Create Stream | \`CreateStream.tsx\` | 2-step form: approve USDC → create stream |
| History | \`History.tsx\` | Compact table of all streams |
| Settings | \`Settings.tsx\` | Wallet info, contract address, budget envelopes |
| Docs | \`Docs.tsx\` | This documentation portal |

**Utility modules** (\`src/lib/\`):

| Module | Purpose |
|---|---|
| \`api.ts\` | Typed fetch wrappers for all backend endpoints |
| \`utils.ts\` | \`cn()\`, \`formatUSDC()\`, \`formatTs()\`, \`rateToMonthly()\` |
| \`theme.tsx\` | \`ThemeProvider\`, \`useTheme()\` hook, localStorage persistence |
| \`markdown.ts\` | Lightweight markdown → HTML renderer (no dependencies) |

---

### 2. Backend (server/)

**Routes:**

| Prefix | File | Endpoints |
|---|---|---|
| \`/streams\` | \`routes/streams.ts\` | \`GET /\` (list), \`GET /:id\`, \`POST /\`, \`PATCH /:id\` |
| \`/budgets\` | \`routes/budgets.ts\` | \`GET /\`, \`POST /\`, \`DELETE /:id\` |
| \`/stats\` | \`routes/stats.ts\` | \`GET /\` (dashboard summary) |
| \`/health\` | inline | \`GET /health\` — \`{ ok: true }\` |

---

### 3. Database (PostgreSQL)

| Table | Purpose |
|---|---|
| \`users\` | Wallet address → display name, created_at |
| \`streams\` | Offchain mirror of onchain streams + metadata |
| \`budget_envelopes\` | Sender-defined spend categories with monthly limit |
| \`onchain_events\` | Raw decoded events from the contract |
| \`indexer_state\` | Single-row cursor: \`last_indexed_block\` |

---

## Data Flow: Creating a Stream

\`\`\`
User fills form
     │
     ▼
CreateStream.tsx
     │
     ├─ Step 1: useWriteContract → USDC.approve(StreamVault, amount)
     │         Wait for tx confirmation
     │
     ├─ Step 2: useWriteContract → StreamVault.createStream(...)
     │         Wait for tx confirmation
     │
     └─ Step 3: POST /api/streams  ← save offchain record
\`\`\`

---

## Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| \`DATABASE_URL\` | Backend | PostgreSQL connection string |
| \`VITE_API_BASE\` | Frontend | API base URL (defaults to \`/api\` via proxy) |
| \`RPC_PROXY_BASE_URL\` | Backend (optional) | Arc Studio managed RPC proxy |
| \`RPC_PROXY_TOKEN\` | Backend (optional) | RPC proxy auth token |

---

## Security Boundaries

- Contract is the canonical source of financial truth. PostgreSQL is a read-optimized mirror.
- The backend has no private keys and no signing capability.
- USDC approval is scoped to the exact deposit amount per stream — no unlimited approvals.
- Contract uses \`SafeERC20\`, \`ReentrancyGuard\`, and pull-based payouts for cancel.
`;

const DOC_03 = `# StreamVault — Smart Contract Reference

---

## Deployment

| Property | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Address | \`0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8\` |
| Compiler | Solidity 0.8.20 |
| OpenZeppelin | 5.x |

---

## Audit History

| Finding | Severity | Status |
|---|---|---|
| Paused time still accrues | High | Fixed — added \`totalPausedDuration\` |
| Cancel bricked by blocklisted recipient | Critical | Fixed — pull via \`pendingWithdrawals\` |
| Fee-on-transfer accounting | High | Fixed — balance-delta check |

---

## Data Structures

### StreamStatus (enum)

\`\`\`
Active     — streaming, accrual running
Paused     — no accrual, sender can resume
Cancelled  — stopped, payouts split
Completed  — all funds withdrawn
\`\`\`

### Stream (struct)

| Field | Type | Description |
|---|---|---|
| \`id\` | \`uint256\` | Stream ID (auto-increment) |
| \`sender\` | \`address\` | Address that created and funded the stream |
| \`recipient\` | \`address\` | Address that accrues and can withdraw |
| \`ratePerSecond\` | \`uint128\` | USDC (6 decimals) per second |
| \`deposit\` | \`uint128\` | Actual received deposit |
| \`withdrawn\` | \`uint128\` | Cumulative amount withdrawn |
| \`startTime\` | \`uint64\` | \`block.timestamp\` at creation |
| \`stopTime\` | \`uint64\` | Extended on each resume |
| \`pausedAt\` | \`uint64\` | Timestamp when paused (0 if active) |
| \`totalPausedDuration\` | \`uint128\` | Cumulative paused seconds |
| \`status\` | \`StreamStatus\` | Current stream state |

---

## Functions

### createStream

\`\`\`solidity
function createStream(
    address recipient,
    uint128 ratePerSecond,
    uint64 durationSeconds,
    string calldata label
) external nonReentrant returns (uint256 streamId)
\`\`\`

Transfers \`deposit\` USDC from \`msg.sender\`, creates a \`Stream\` record, emits \`StreamCreated\`.

### withdrawFromStream

\`\`\`solidity
function withdrawFromStream(uint256 streamId) external nonReentrant
\`\`\`

Computes claimable balance, transfers to recipient. Marks Completed if fully withdrawn.

### cancelStream

\`\`\`solidity
function cancelStream(uint256 streamId) external nonReentrant
\`\`\`

Computes accrued amount, adds recipient's share to \`pendingWithdrawals\`, refunds sender directly.

### pauseStream / resumeStream

\`\`\`solidity
function pauseStream(uint256 streamId) external
function resumeStream(uint256 streamId) external
\`\`\`

Pause snapshots \`accruedAtPause\`. Resume extends \`stopTime\` and increments \`totalPausedDuration\`.

### claimPending

\`\`\`solidity
function claimPending() external nonReentrant
\`\`\`

Claims the caller's \`pendingWithdrawals\` balance (populated by cancelled streams).

### balanceOf

\`\`\`solidity
function balanceOf(uint256 streamId) external view
    returns (uint128 recipientBalance, uint128 senderBalance)
\`\`\`

Returns live claimable balance for recipient and remaining deposit for sender.

---

## Accrual Math

\`\`\`
if Paused or Cancelled:  return accruedAtPause
if Completed:            return deposit

effectiveEnd = min(block.timestamp, stopTime)
elapsed = effectiveEnd - startTime - totalPausedDuration
accrued = elapsed * ratePerSecond
return min(accrued, deposit)
\`\`\`

Key invariant: **paused time never accrues value.**

---

## Events

| Event | Emitted By | Fields |
|---|---|---|
| \`StreamCreated\` | \`createStream\` | streamId, sender, recipient, ratePerSecond, deposit, startTime, stopTime |
| \`Withdrawal\` | \`withdrawFromStream\` | streamId, recipient, amount |
| \`StreamCancelled\` | \`cancelStream\` | streamId, sender, recipientPayout, senderRefund |
| \`StreamPaused\` | \`pauseStream\` | streamId, sender, accruedSoFar |
| \`StreamResumed\` | \`resumeStream\` | streamId, sender, newStopTime |
| \`PendingClaimed\` | \`claimPending\` | claimant, amount |

---

## Custom Errors

| Error | Thrown When |
|---|---|
| \`StreamNotFound\` | Stream ID has no sender |
| \`NotStreamSender\` | Caller is not the stream sender |
| \`NotStreamRecipient\` | Caller is not the stream recipient |
| \`StreamNotActive\` | Operation requires Active status |
| \`StreamAlreadyPaused\` | Pause called on already-paused stream |
| \`ZeroAddress\` | Zero address passed |
| \`SenderIsRecipient\` | Sender and recipient are the same |
| \`InvalidRate\` | Rate is 0 or deposit overflows |
| \`InvalidDuration\` | Duration is 0 or exceeds 3650 days |
| \`NothingToWithdraw\` | Claimable balance is 0 |
| \`InsufficientTransfer\` | Received less than expected |
`;

const DOC_04 = `# StreamVault — Design System

---

## Philosophy

StreamVault uses a **glassmorphism + dark-safe layered surface** system. Cards float above gradient backgrounds with subtle blur and translucency. The palette skews dark-blue-navy in both light and dark modes.

Design rules:
- Semantic tokens only — no raw hex for theme-sensitive colors
- Dark mode is first-class, not an afterthought
- Typography hierarchy is tight: \`display\` (Space Grotesk) for headings
- Whitespace is generous; information density is deliberate
- Interactive states are always visible

---

## Color Tokens

All tokens live in \`src/index.css\` under \`:root\` (light) and \`.dark\` (dark).

### Background & Surface

| Token | Light | Dark | Usage |
|---|---|---|---|
| \`--bg\` | \`#f6f7fb\` | \`#0c1220\` | Page background |
| \`--surface\` | \`rgba(255,255,255,0.80)\` | \`rgba(22,32,52,0.85)\` | Glass card background |
| \`--surface-muted\` | \`#f1f3f8\` | \`#111827\` | Input backgrounds |
| \`--sidebar-bg\` | \`rgba(255,255,255,0.92)\` | \`rgba(10,18,32,0.95)\` | Sidebar panel |
| \`--topbar-bg\` | \`rgba(255,255,255,0.85)\` | \`rgba(10,18,32,0.90)\` | Topbar panel |

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| \`--ink\` | \`#0f1f3d\` | \`#e8f0ff\` | Primary text |
| \`--muted\` | \`#5a6a82\` | \`#7a90b0\` | Tertiary / label text |
| \`--subtle\` | \`#8a96ac\` | \`#4d6480\` | Placeholder, hint text |

### Brand & Status

| Token | Color | Usage |
|---|---|---|
| \`--accent\` | \`#122d45\` / \`#3b82f6\` | Primary action color |
| \`--success\` | \`#1a8047\` | Active streams, positive states |
| \`--warn\` | \`#c47a0a\` | Paused streams, warnings |
| \`--danger\` | \`#ba2b4c\` | Cancelled streams, errors |

---

## Typography

| Font | Class | Usage |
|---|---|---|
| Space Grotesk | \`.display\` | Headings, brand name, numbers |
| System sans-serif | body default | Body text, labels, inputs |
| Monospace | \`.mono\` | Addresses, hashes, tx IDs |

---

## Component Patterns

### Glass Card

\`\`\`tsx
<div className="glass-card p-5">
  {/* background: var(--surface), blur(12px), border: 1px solid var(--border) */}
</div>
\`\`\`

### Hover Surface

\`\`\`tsx
className="hover-surface"
// Safe in both light and dark — never hover:bg-black/5
\`\`\`

### Status Badge

\`\`\`tsx
const STATUS_STYLES = {
  active:    { bg: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--success)' },
  paused:    { bg: 'color-mix(in srgb, var(--warn) 12%, transparent)',    color: 'var(--warn)'    },
  cancelled: { bg: 'color-mix(in srgb, var(--danger) 12%, transparent)',  color: 'var(--danger)'  },
};
\`\`\`

---

## Layout System

| Context | Grid |
|---|---|
| Dashboard stat cards | \`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4\` |
| Stream list | \`grid-cols-1 md:grid-cols-2 xl:grid-cols-3\` |
| Create stream | \`grid-cols-1 xl:grid-cols-[1fr_380px]\` |
| Settings | \`grid-cols-1 xl:grid-cols-[380px_1fr]\` |

---

## Dark Mode Rules

1. **Never use \`hover:bg-black/5\`** — use \`hover-surface\` class
2. **Never use raw rgba with white/black** for theme-sensitive surfaces — use CSS vars
3. **\`color-mix(in srgb, var(--token) N%, transparent)\`** for tinted backgrounds
4. **Footer** has its own fixed dark palette — intentional, do not add light mode overrides
5. **Charts and status colors** are brand colors — do not change between themes

---

## Category Colors

| Category | Color |
|---|---|
| payroll | \`#2563eb\` (blue) |
| subscription | \`#7c3aed\` (purple) |
| grant | \`#059669\` (green) |
| retainer | \`#d97706\` (amber) |
| other | \`#64748b\` (slate) |
`;

const DOC_05 = `# StreamVault — Coding Standards

---

## General Rules

1. **Read before editing.** Always read the file before using \`edit_file\`.
2. **No hardcoded values in UI.** Import from \`src/onchain-facts.ts\` and \`src/onchain-money.ts\`.
3. **No raw hex colors** for theme-sensitive values. Use \`var(--token)\` CSS variables.
4. **Never \`hover:bg-black/5\`** — use \`hover-surface\` class (dark-safe).
5. **TypeScript strict.** No \`any\`. Use proper types for all props, state, and API responses.
6. **Error handling.** Never swallow errors silently.

---

## TypeScript Patterns

### Props and State

\`\`\`ts
interface StreamCardProps {
  stream: StreamRecord;
  onRefresh: () => void;
}

type StreamStatus = 'active' | 'paused' | 'cancelled' | 'completed';
\`\`\`

### Async / Effects

\`\`\`ts
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
\`\`\`

---

## Onchain Patterns

### Always import facts, never type them

\`\`\`ts
// WRONG
const USDC = '0x3600000000000000000000000000000000000000';

// CORRECT
import { getUsdc } from '@/onchain-facts';
const usdc = getUsdc(chainId);
\`\`\`

### All decimal math through onchain-money

\`\`\`ts
// WRONG
const amount = BigInt(value) * 10n ** 6n;

// CORRECT
import { parseUsdc, formatUsdc } from '@/onchain-money';
const amount = parseUsdc(value);
\`\`\`

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| React components | PascalCase | \`StreamCard\`, \`CreateStream\` |
| Hooks | camelCase with \`use\` prefix | \`useTheme\`, \`useStreamBalance\` |
| Constants | UPPER_SNAKE_CASE | \`STREAM_VAULT_ADDRESS\` |
| CSS variables | kebab-case with \`--\` | \`--surface-muted\` |
| DB tables | snake_case | \`budget_envelopes\` |
| DB columns | snake_case | \`rate_per_second\` |

---

## Forbidden Patterns

\`\`\`ts
// Never use any
const data: any = response;

// Never hover:bg-black/* in components
className="hover:bg-black/5"  // use hover-surface instead

// Never hardcode onchain addresses
const USDC = '0x3600...';

// Never write your own bigint decimal math
const amount = BigInt(val) * 10n ** 6n;

// Never call .json() without checking response.ok
const data = await fetch(url).then(r => r.json()); // wrong
// Correct:
const r = await fetch(url);
if (!r.ok) throw new Error(\`HTTP \${r.status}\`);
const data = await r.json();
\`\`\`

---

## Lint & Type Checks

\`\`\`bash
bun run check   # runs oxlint + tsc --noEmit
\`\`\`

- **0 errors** required before every commit
- Warnings allowed only for pre-approved patterns
- The \`react/set-state-in-effect\` rule is set to \`warn\` — idiomatic data-fetch effects use this pattern
`;

const DOC_06 = `# StreamVault — Development Workflow

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Foundry](https://book.getfoundry.sh) (for contract work)
- [Docker](https://docker.com) (for local PostgreSQL)
- Node.js >= 20 (for Circle CLI)

### Setup

\`\`\`bash
# 1. Clone
git clone https://github.com/haileva/streamvault
cd streamvault

# 2. Install dependencies
bun install

# 3. Set up environment
cp .env.example .env   # fill in DATABASE_URL

# 4. Start PostgreSQL (Docker)
docker run -d \\
  --name streamvault-pg \\
  -e POSTGRES_USER=streamvault \\
  -e POSTGRES_PASSWORD=streamvault \\
  -e POSTGRES_DB=streamvault \\
  -p 5432:5432 \\
  postgres:18-alpine

# 5. Start the backend
bun run server

# 6. Start the frontend (separate terminal)
bun run dev
\`\`\`

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| \`bun run dev\` | \`vite\` | Start Vite dev server with HMR |
| \`bun run server\` | \`bun run server/index.ts\` | Start Express API server |
| \`bun run check\` | \`bash scripts/check.sh\` | Run oxlint + TypeScript check |
| \`bun run contracts:build\` | \`forge build\` | Compile Solidity contracts |
| \`bun run contracts:test\` | \`forge test\` | Run Foundry unit tests |

---

## Git Workflow

### Branch Strategy

\`\`\`
main            — production-ready, always deployable
feat/<name>     — new features
fix/<name>      — bug fixes
refactor/<name> — refactors without behavior change
docs/<name>     — documentation only
security/<name> — dependency or security fixes
\`\`\`

### Commit Message Format

\`\`\`
<type>(<scope>): <short description>
\`\`\`

| Type | When to use |
|---|---|
| \`feat\` | New feature |
| \`fix\` | Bug fix |
| \`refactor\` | Code change with no behavior change |
| \`style\` | Formatting, CSS-only changes |
| \`docs\` | Documentation only |
| \`security\` | Security / dependency fix |
| \`chore\` | Tooling, config changes |

---

## Quality Gates

Every push to \`main\` must pass:

\`\`\`bash
bun run check           # 0 errors required
bun run contracts:build # no compilation errors (if contracts changed)
bun run contracts:test  # all tests pass (if contract logic changed)
bunx vite build         # successful build
\`\`\`

---

## Audit Severity Policy

| Severity | Policy |
|---|---|
| Critical | Must fix before deploy |
| High | Must fix before deploy |
| Medium | Fix or document accepted risk |
| Low | Fix where practical |

---

## Security Audits

\`\`\`bash
bun audit
\`\`\`

Use \`overrides\` in \`package.json\` to force patched versions of transitive dependencies.
**Never use \`--force\` without verifying compatibility.**

Current status: 1 remaining low-severity vulnerability in \`elliptic\` (no upstream patch available).

---

## Deployment

\`\`\`bash
# Deploy contract
bun run compass:deploy

# Deploy frontend to Netlify / Hugging Face
# → Connect via Arc Studio sidebar → "deploy this"
\`\`\`

Mainnet deployment requires an independent security audit and is performed outside Arc Studio.
`;

/* ─── Doc registry ─────────────────────────────────────────────── */

interface DocEntry {
  id: string;
  title: { en: string; vi: string };
  subtitle: { en: string; vi: string };
  content: { en: string; vi: string };
  badge?: { en: string; vi: string };
}

const DOCS: DocEntry[] = [
  {
    id: '01-overview',
    title:    { en: 'Overview',          vi: 'Tổng Quan'        },
    subtitle: { en: 'What StreamVault is and does', vi: 'StreamVault là gì và làm gì' },
    content:  { en: DOC_01, vi: DOC_01_VI },
    badge:    { en: 'Start here', vi: 'Bắt đầu' },
  },
  {
    id: '02-architecture',
    title:    { en: 'Architecture',      vi: 'Kiến Trúc'        },
    subtitle: { en: 'System design and data flows', vi: 'Thiết kế hệ thống và luồng dữ liệu' },
    content:  { en: DOC_02, vi: DOC_02_VI },
  },
  {
    id: '03-smart-contract',
    title:    { en: 'Smart Contract',    vi: 'Smart Contract'   },
    subtitle: { en: 'Contract reference and audit history', vi: 'Tài liệu hợp đồng và lịch sử kiểm toán' },
    content:  { en: DOC_03, vi: DOC_03_VI },
  },
  {
    id: '04-design-system',
    title:    { en: 'Design System',     vi: 'Hệ Thống Thiết Kế' },
    subtitle: { en: 'Tokens, typography, components', vi: 'Tokens, typography, components' },
    content:  { en: DOC_04, vi: DOC_04_VI },
  },
  {
    id: '05-coding-standards',
    title:    { en: 'Coding Standards',  vi: 'Tiêu Chuẩn Code'  },
    subtitle: { en: 'Rules, patterns, naming', vi: 'Quy tắc, patterns, đặt tên' },
    content:  { en: DOC_05, vi: DOC_05_VI },
  },
  {
    id: '06-workflow',
    title:    { en: 'Workflow',          vi: 'Quy Trình'        },
    subtitle: { en: 'Git, scripts, quality gates, deploy', vi: 'Git, scripts, quality gates, deploy' },
    content:  { en: DOC_06, vi: DOC_06_VI },
  },
];

/* ─── Table of Contents ─────────────────────────────────────────── */

function TableOfContents({ headings, activeId }: { headings: Heading[]; activeId: string }) {
  if (headings.length === 0) return null;
  return (
    <nav className="space-y-0.5">
      {headings.filter(h => h.level <= 3).map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className={cn(
            'block text-xs leading-relaxed py-0.5 transition-colors truncate',
            h.level === 1 ? 'font-semibold' : h.level === 2 ? 'pl-3' : 'pl-6',
            activeId === h.id
              ? 'font-medium'
              : 'hover:opacity-100 opacity-70',
          )}
          style={{ color: activeId === h.id ? 'var(--accent)' : 'var(--muted)' }}
        >
          {h.level >= 2 && <Hash size={9} className="inline mr-1 opacity-50" />}
          {h.text}
        </a>
      ))}
    </nav>
  );
}

/* ─── Markdown renderer component ──────────────────────────────── */

function MarkdownContent({ html }: { html: string }) {
  return (
    <div
      className="doc-prose"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ─── Main Docs view ────────────────────────────────────────────── */

export function Docs() {
  const [activeDocId, setActiveDocId] = useState(DOCS[0].id);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('sv-docs-lang') as Lang) ?? 'en'; }
    catch { return 'en'; }
  });
  const contentRef = useRef<HTMLDivElement>(null);

  // Persist lang preference
  useEffect(() => {
    try { localStorage.setItem('sv-docs-lang', lang); } catch { /* ignore */ }
  }, [lang]);

  const activeDoc = DOCS.find(d => d.id === activeDocId) ?? DOCS[0];
  const html = renderMarkdown(activeDoc.content[lang]);
  const headings = extractHeadings(activeDoc.content[lang]);

  // Scroll-spy for ToC
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const els = container.querySelectorAll('h1,h2,h3');
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveHeadingId(e.target.id);
            break;
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [activeDocId]);

  // Scroll to top when doc changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
    setActiveHeadingId('');
  }, [activeDocId]);

  const handleNav = useCallback((id: string) => {
    setActiveDocId(id);
    setMobileSidebarOpen(false);
  }, []);

  return (
    <div className="flex gap-0 min-h-[calc(100vh-64px)] -mx-5 lg:-mx-8 -mt-6 lg:-mt-8">

      {/* ── Left doc sidebar ─────────────────────────────────── */}
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'var(--overlay)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'shrink-0 flex flex-col border-r overflow-y-auto',
          'fixed lg:sticky top-16 bottom-0 z-30 lg:z-auto',
          'transition-transform duration-200 lg:translate-x-0',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'w-64',
        )}
        style={{
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          height: 'calc(100vh - 64px)',
        }}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <BookOpen size={15} style={{ color: 'var(--accent)' }} />
              <span className="display font-bold text-sm" style={{ color: 'var(--ink)' }}>
                {lang === 'en' ? 'Documentation' : 'Tài Liệu'}
              </span>
            </div>
            {/* EN / VI toggle */}
            <button
              onClick={() => setLang(l => l === 'en' ? 'vi' : 'en')}
              title={lang === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold hover-surface transition-colors"
              style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
            >
              <Languages size={12} />
              {lang === 'en' ? 'VI' : 'EN'}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--subtle)' }}>StreamVault v1.0</p>
        </div>

        {/* Doc list */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {DOCS.map((doc, idx) => {
            const isActive = doc.id === activeDocId;
            return (
              <button
                key={doc.id}
                onClick={() => handleNav(doc.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl transition-all group',
                  isActive ? '' : 'hover-surface',
                )}
                style={isActive
                  ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }
                  : { border: '1px solid transparent' }
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                    style={isActive
                      ? { background: 'var(--accent)', color: 'white' }
                      : { background: 'var(--surface-muted)', color: 'var(--muted)' }
                    }
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: isActive ? 'var(--accent)' : 'var(--ink)' }}
                    >
                      {doc.title[lang]}
                    </p>
                  </div>
                  {doc.badge && (
                    <span
                      className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ background: 'var(--success)', color: 'white' }}
                    >
                      {doc.badge[lang]}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight size={12} className="ml-auto shrink-0" style={{ color: 'var(--accent)' }} />
                  )}
                </div>
                <p className="text-[11px] mt-0.5 pl-7 truncate" style={{ color: 'var(--subtle)' }}>
                  {doc.subtitle[lang]}
                </p>
              </button>
            );
          })}
        </nav>

        {/* Footer link */}
        <div className="px-4 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <a
            href="https://github.com/haileva/streamvault"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs hover-surface px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <ExternalLink size={12} />
            {lang === 'en' ? 'View on GitHub' : 'Xem trên GitHub'}
          </a>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile toolbar */}
        <div
          className="lg:hidden flex items-center gap-3 px-5 py-3 border-b sticky top-16 z-20"
          style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMobileSidebarOpen(o => !o)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover-surface shrink-0"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
            aria-label="Open docs navigation"
          >
            {mobileSidebarOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
          <span className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--ink)' }}>
            {activeDoc.title[lang]}
          </span>
          <button
            onClick={() => setLang(l => l === 'en' ? 'vi' : 'en')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold hover-surface transition-colors shrink-0"
            style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            <Languages size={11} />
            {lang === 'en' ? 'VI' : 'EN'}
          </button>
        </div>

        <div className="flex flex-1 min-w-0">
          {/* Article */}
          <article
            ref={contentRef}
            className="flex-1 min-w-0 px-6 lg:px-10 py-8 overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 64px)' }}
          >
            {/* Doc header */}
            <div className="mb-8 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                >
                  {String(DOCS.findIndex(d => d.id === activeDocId) + 1).padStart(2, '0')} / {String(DOCS.length).padStart(2, '0')}
                </span>
                {activeDoc.badge && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: 'var(--success)', color: 'white' }}
                  >
                    {activeDoc.badge[lang]}
                  </span>
                )}
              </div>
              <h1 className="display text-3xl font-bold mb-2" style={{ color: 'var(--ink)' }}>
                {activeDoc.title[lang]}
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{activeDoc.subtitle[lang]}</p>
            </div>

            {/* Rendered markdown */}
            <MarkdownContent html={html} />

            {/* Prev / Next navigation */}
            <div className="mt-12 pt-6 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
              {(() => {
                const idx = DOCS.findIndex(d => d.id === activeDocId);
                const prev = DOCS[idx - 1];
                const next = DOCS[idx + 1];
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => handleNav(prev.id)}
                        className="flex items-center gap-2 text-sm hover-surface px-4 py-2.5 rounded-xl transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                      >
                        <ChevronRight size={14} className="rotate-180" />
                        <span>{prev.title[lang]}</span>
                      </button>
                    ) : <div />}
                    {next ? (
                      <button
                        onClick={() => handleNav(next.id)}
                        className="flex items-center gap-2 text-sm hover-surface px-4 py-2.5 rounded-xl transition-colors ml-auto"
                        style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                      >
                        <span>{next.title[lang]}</span>
                        <ChevronRight size={14} />
                      </button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </article>

          {/* ── Right ToC sidebar ──────────────────────────── */}
          <div
            className="hidden xl:block shrink-0 w-56 px-4 py-8 border-l sticky top-16 overflow-y-auto"
            style={{ borderColor: 'var(--border)', height: 'calc(100vh - 64px)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--subtle)' }}>
              {lang === 'en' ? 'On this page' : 'Trên trang này'}
            </p>
            <TableOfContents headings={headings} activeId={activeHeadingId} />
          </div>
        </div>
      </div>
    </div>
  );
}
