# StreamVault — Comprehensive Project Audit Report
**Date:** October 1, 2026  
**Auditor role:** Senior Product Architect, Senior Software Engineer, UX/UI Designer, Security Reviewer, Product Strategist  
**Scope:** Full codebase — smart contract, backend API, frontend, database schema, infrastructure, UX/UI, security, architecture

---

## EXECUTIVE SUMMARY

StreamVault is a genuinely functional, well-structured USDC streaming application on Arc Testnet. The core stream lifecycle (create, pause, resume, cancel, withdraw) works end-to-end from UI to on-chain. The codebase is clean, the design system is consistent, and several good engineering decisions have been made (pull-based cancel, audit-fixed contract, search_path schema isolation, vercel serverless functions). However, the system has meaningful gaps that would prevent production use: no onchain event indexer exists despite the schema supporting one, off-chain DB state diverges from on-chain truth after every action, there is no authentication whatsoever, the `pendingWithdrawals` UI surface is entirely missing, and budget envelopes are entirely decorative (never updated by actual stream spend).

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Stack — Confirmed

| Layer | Technology | Status |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v3 | ✅ Running |
| Wallet | wagmi v2 + ConnectKit + viem | ✅ Integrated |
| Smart contract | Solidity 0.8.20 + OpenZeppelin, deployed Arc Testnet | ✅ Deployed |
| Backend API | Vercel Serverless Functions (`api/*.ts`) | ✅ Deployed |
| Database | PostgreSQL, schema `streamvault` | ✅ Running |
| Hosting | Vercel (static + serverless) | ✅ Live |
| Theme | CSS custom properties + React context, dark/light | ✅ Working |

### 1.2 Data Flow

```
User Browser → wagmi/viem → Arc Testnet RPC → StreamVault contract
                ↓
           /api/* (Vercel Serverless)
                ↓
        PostgreSQL (streamvault schema)
```

**Critical observation:** The two data stores (on-chain contract state vs PostgreSQL) have **no synchronization mechanism in production**. The `indexer_state` table exists in the schema with `last_indexed_block = 0` — but **no indexer process has been implemented or deployed**. The PostgreSQL database is populated only by client-side `api.streams.create()` calls in `CreateStream.tsx`, and status updates are fire-and-forget `api.streams.update()` calls in `StreamCard.tsx` action handlers. This means PostgreSQL is always a best-effort approximation of on-chain truth, not a reliable index.

---

## 2. SMART CONTRACT AUDIT

### 2.1 Implementation Status: ✅ Deployed and Functional

Contract: `0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8` on Arc Testnet.

**Confirmed implemented functions:**
- `createStream(recipient, ratePerSecond, durationSeconds, label)` ✅
- `withdrawFromStream(streamId)` ✅
- `cancelStream(streamId)` — pull-based for recipient ✅
- `pauseStream(streamId)` ✅
- `resumeStream(streamId)` ✅
- `claimPending()` ✅
- `balanceOf(streamId) returns (recipientBalance, senderBalance)` ✅

**Security fixes confirmed applied:**
1. Fee-on-transfer guard (balance before/after `safeTransferFrom`) ✅
2. Pull-based cancel (`pendingWithdrawals` mapping) ✅
3. Pause accrual fix (`totalPausedDuration` accumulator) ✅

### 2.2 Contract Issues Found

**Issue C1 — `getStream` in ABI but not in Solidity source**  
`contract.ts` ABI includes a `getStream(uint256)` function. The Solidity source does **not** declare a public `getStream()` function — the mapping `streams` is `public` which creates a getter, but the ABI signature for a tuple-returning `getStream` does not match the auto-generated getter for a struct mapping (Solidity struct getters return individual fields, not a tuple). Any call to `getStream` via the ABI will revert or return incorrect data.

**Issue C2 — `streamLabels` mapping inaccessible from UI**  
`streamLabels` is a public mapping storing on-chain labels, but no frontend code reads it. Labels are stored in PostgreSQL only. If the DB diverges, the on-chain label is orphaned and unreadable to users.

**Issue C3 — `pendingWithdrawals` has UI surface in ABI but no UI in frontend**  
The ABI exposes `pendingWithdrawals(address)` and there is a `claimPending()` function. No UI component reads `pendingWithdrawals[userAddress]` or presents a "Claim pending" button. If a stream is cancelled and the recipient has accrued USDC, they have **no way** to claim it through the UI. This is a **fund accessibility bug**.

**Issue C4 — `window.confirm` for cancel (UX, not security)**  
`StreamCard.tsx:133` uses `window.confirm()` for cancel confirmation. This is blocking, inaccessible, unstyled, and behaves differently across browsers/devices.

---

## 3. FRONTEND AUDIT

### 3.1 Architecture

- **Pattern:** Multi-view SPA, no router, `App.tsx` switches views via `useState<View>`. Clean and minimal.
- **Component structure:** `src/views/` (6 views) + `src/components/` (StreamCard, Layout, Footer). Reasonable separation.
- **State management:** Local `useState` + `useEffect` data fetching. No React Query, no Zustand, no SWR. This is appropriate for the current scale but creates manual cache invalidation problems (partially fixed by `refreshToken`).
- **Type safety:** Good — `StreamRecord`, `BudgetRecord`, `DashboardStats` interfaces defined and used.

### 3.2 Feature-by-Feature Analysis

---

#### Feature 1: Dashboard
**Status: Khá hoàn thiện — has meaningful gaps**

| Attribute | Assessment |
|---|---|
| Frontend component | `src/views/Dashboard.tsx` |
| API | `GET /api/stats?address=`, `GET /api/streams?address=&status=active&limit=4` |
| DB tables | `streams`, `budget_envelopes` |

**Strengths:**
- 4 stat cards (balance, sending count, receiving count, completed count) with loading skeleton
- Active streams preview (up to 4), live per-second ticker via `StreamCard`
- CTA cards with correct category pre-seeding (fixed in recent session)
- USDC balance from on-chain via `useReadContract`

**Issues:**
- `StreamCard onRefresh={() => {}}` on Dashboard — no-op. If a user withdraws or pauses a stream from the Dashboard preview, the card does not reload. The `onRefresh` prop exists on `StreamCard` but Dashboard passes a no-op.
- Stats (`sent.active_count`, etc.) come from PostgreSQL, not on-chain — can be stale.
- No error state for failed stats/streams fetch — silent failure shows `—` values forever.
- No "retry" affordance when API calls fail.

---

#### Feature 2: Streams List
**Status: Khá hoàn thiện**

| Attribute | Assessment |
|---|---|
| Frontend | `src/views/Streams.tsx` |
| API | `GET /api/streams?address=&role=&status=&category=&limit=&offset=` |
| DB tables | `streams` |

**Strengths:**
- Filtering by status, role, category — all wired
- Search (client-side on fetched page — not full-text DB search)
- Pagination with page size 10
- Refresh button
- `refreshToken` integration — re-fetches after create

**Issues:**
- Client-side search only filters the current fetched page (10 items), not the full dataset.
- No sort control (currently always `ORDER BY created_at DESC` in API).
- No empty state distinguishing "no streams at all" vs "no streams matching filter."
- `hover:bg-black/5` in the refresh button class — may have escaped the hover-surface migration.

---

#### Feature 3: Create Stream
**Status: Khá hoàn thiện — 2-step approval flow works**

| Attribute | Assessment |
|---|---|
| Frontend | `src/views/CreateStream.tsx` |
| Contract | `approve()` → `createStream()` |
| API | `POST /api/streams` |

**Strengths:**
- Step indicator (Configure → Approve → Create → Live)
- Live preview panel at xl
- USDC balance guard (insufficient balance warning)
- Wrong network guard with auto-switch
- Allowance check — skips approve step if already approved
- `initialCategory` from Dashboard CTAs (fixed)
- `onSuccess` → `refreshToken` bump (fixed)

**Issues:**
- `keccak256StreamCreated` constant on line 582 is a **fake/placeholder hash** — `'ac5de3e8f2b21a8ffa2f13b20b6b1c0e4d3c7f5a9e2b8d3c6f1a4e7b0d5c8f2'`. The actual keccak256 of `"StreamCreated(uint256,address,address,uint128,uint128,uint64,uint64)"` is different. This means `log?.topics[0] === '0x' + keccak256StreamCreated` will **never match**, so `streamId` is always extracted from `topics[1]` correctly only if the log topic index is right — but the guard condition for finding the log is always false. `sid` will fall back to `String(Date.now())` instead of the real on-chain stream ID. This is a **data integrity bug**: the PostgreSQL `stream_id` will be a timestamp, not the on-chain ID, making `balanceOf(streamId)` calls from `StreamCard` fail.
- Custom duration input (seconds field) exists in code comment but no UI for it beyond the 4 presets.
- No recipient ENS resolution or label suggestion.
- After success, "Create another stream" resets form but stays on the success screen — requires a page reload or nav to leave.

---

#### Feature 4: StreamCard (shared component)
**Status: Khá hoàn thiện — core actions work**

**Strengths:**
- Live on-chain `balanceOf` polling every 5s
- Ticker interval for active streams
- Withdraw, Pause, Resume, Cancel actions
- Role-based action visibility (sender vs recipient)
- Expandable details panel
- `pendingWithdrawals` — **missing**: no read of `pendingWithdrawals[address]`, no "Claim pending" button after cancel

**Issues:**
- Status updates (`api.streams.update(stream.stream_id, { status: ... })`) are fire-and-forget **optimistic mutations** called before the transaction confirms. If the tx fails (user rejects in wallet), the DB status is already updated to 'paused'/'active'/'cancelled'. The reversal never happens.
- After `isSuccess`, only `refetchBalance()` and `onRefresh()` are called — stream status in DB is not synced post-confirmation.
- No loading state between clicking an action and wallet confirmation — the button spins but the card does not show what action is in-flight.

---

#### Feature 5: History
**Status: Cần cải thiện**

**Issues:**
- No filters — shows all streams regardless of status/role/category.
- No sort — always newest first.
- No click-through to stream detail or StreamCard.
- No export (CSV/JSON).
- Does not respect `refreshToken` — creating a stream and going to History immediately shows stale data.
- `STATUS_ICONS.active` shows a `Pause` icon — semantically wrong (active should be a play/streaming icon).

---

#### Feature 6: Settings
**Status: Cần cải thiện**

**Issues:**
- `_setNewPeriod` (line 20): `setNewPeriod` is declared but unused (`_setNewPeriod` prefix). The period selector UI is absent — all budgets silently default to 30 days with no way to change it.
- Budget `spent_amount` is **never updated** — there is no code path that calls `api.budgets.update()` when a stream is created or payment flows. The progress bar always shows 0% spent.
- Wallet section shows address truncated to 10+6 chars with no copy button.
- Contract address has no copy button and no explorer link.
- "Network" is hardcoded to "Arc Testnet" regardless of what chain the wallet is connected to — misleading if user is on wrong network.

---

#### Feature 7: Docs
**Status: Hoàn thiện for its scope**

- Inline markdown renderer, 6 docs, scroll-spy ToC, Prev/Next navigation.
- Minor: ToC is xl+ only, not accessible on tablet.

---

### 3.3 Missing UI Features

**`claimPending` UI** — described above under C3. Critical missing feature.

**Notification/alert system** — toast notifications exist for actions, but there is no persistent notification area. A user who is a stream recipient has no way to know a stream was created for them unless they happen to be on the Streams page.

---

## 4. BACKEND / API AUDIT

### 4.1 API Routes — Confirmed Implemented

| Route | Method | Status |
|---|---|---|
| `/api/streams` | GET (list + single) | ✅ |
| `/api/streams` | POST | ✅ |
| `/api/streams` | PATCH | ✅ |
| `/api/budgets` | GET, POST, PATCH, DELETE | ✅ |
| `/api/stats` | GET | ✅ |
| `/api/health` | GET | ✅ |

### 4.2 Authentication and Authorization — ABSENT

**Severity: Critical for production.**

There is no authentication layer on any API route. Any party who knows a wallet address can:
- `GET /api/streams?address=0x...` — read all streams for any wallet
- `POST /api/streams` — create a stream record for any wallet without signing
- `PATCH /api/streams?streamId=X` — update status of any stream to any value
- `DELETE /api/budgets?id=X` — delete any budget by guessing the numeric ID
- `GET /api/stats?address=0x...` — read financial stats for any wallet

Since this is a testnet application, the risk is limited now. However, the `/api/stats` route exposes `total_deposited` amounts and stream metadata for any address. The PATCH and DELETE routes allow arbitrary data manipulation.

**Proposed fix direction:** Require a signed EIP-191 message (e.g., `POST /api/auth/verify` returns a session token) or use a short-lived HMAC tied to wallet address + timestamp. The frontend already has the connected wallet — signing a challenge is a one-line wagmi call.

### 4.3 Input Validation — Partial

- Stream POST validates required fields ✅
- No validation that `sender_address` matches any authenticated context ❌
- No validation that `stream_id` is a valid uint256 (accepts any string) ❌
- No address format validation (42-char hex) — raw values stored directly ❌
- `rate_per_second` and `deposited_amount` stored as strings without numeric validation ❌
- Budget `limit_amount` stored without checking it's a valid integer string ❌

### 4.4 Error Handling

- All routes catch and return `500 { error: 'internal server error' }` — good
- `503 { error: 'database not configured' }` for missing `DATABASE_URL` — good
- No structured error codes — clients can only check HTTP status
- `console.error` in production Vercel functions — logs are visible in Vercel dashboard, acceptable

### 4.5 Rate Limiting — ABSENT

No rate limiting on any API route. A bot could spam `POST /api/streams` to fill the database. Vercel has platform-level limits but no application-level rate limiting.

### 4.6 CORS

`Access-Control-Allow-Origin: *` on all `/api/*` routes. Acceptable for a public API, but combined with no authentication means any website can read any user's stream data by guessing their address.

### 4.7 Onchain Indexer — Schema exists, implementation ABSENT

`onchain_events` table and `indexer_state` table exist in the schema. The `last_indexed_block` is seeded to 0. There is no indexer process — no event listener, no poller, no background job. This means:

1. Streams created by other tools (direct contract calls, other frontends) never appear in the DB.
2. Status changes that happen on-chain (stream completion by time) never update the DB.
3. `withdrawn_amount` in the DB is never updated when a recipient withdraws.
4. The DB state after a cancel operation has wrong `withdrawn_amount` (never decremented).

---

## 5. DATABASE AUDIT

### 5.1 Schema — Well-designed

The schema is appropriate for the use case. Key observations:

**Strengths:**
- `stream_id BIGINT NOT NULL UNIQUE` — correct type for uint256 contract IDs
- Proper numeric columns (`NUMERIC(36,0)`) for USDC raw amounts
- `onchain_events` with `UNIQUE(tx_hash, log_index)` — idempotent event ingestion ✅
- `indexer_state` with a CHECK constraint ensuring single-row ✅
- All tables in `streamvault` schema (isolated from `public`) ✅
- Proper indexes on high-cardinality lookup columns ✅

**Issues:**
- `stream_id` is `BIGINT` but contract emits `uint256`. For Arc Testnet with few streams this is fine, but `uint256` can exceed `BIGINT` max (`9.2 × 10^18` vs `1.16 × 10^77`). Should be `NUMERIC(78,0)` or `VARCHAR(78)` for true production safety.
- `withdrawn_amount` has no update path (no indexer, no API endpoint that updates it based on `Withdrawal` events).
- `status` column has no database-level CHECK constraint — `status = 'flying-spaghetti'` is a valid insert.
- `label` in DB (up to 200 chars) but contract stores label on-chain as well — no sync between the two.
- `budget_envelopes.spent_amount` is always 0 — no mechanism updates it.
- No `updated_by` or audit log for PATCH operations.
- `users` table exists in schema but is never written to or read by any API route.

### 5.2 Migration Strategy

There is no migration tooling (no Flyway, Drizzle migrations, node-pg-migrate, etc.). The `initSchema()` function uses `CREATE TABLE IF NOT EXISTS` — safe for initial creation but **cannot evolve the schema**. If a column needs to be added, renamed, or a constraint changed, there is no mechanism to apply that without a manual `ALTER TABLE`.

### 5.3 Connection Pooling

- Local dev: `max: 10` — reasonable
- Vercel serverless: `max: 3` per function instance — appropriate for serverless cold starts
- `idleTimeoutMillis: 10_000` — good for serverless
- Pool singleton pattern (`let _pool: Pool | null = null`) — correct for warm invocations

---

## 6. INFRASTRUCTURE AUDIT

### 6.1 Environment Variables

| Variable | Used | Verified |
|---|---|---|
| `DATABASE_URL` | Backend | Set in Vercel env |
| `VITE_API_BASE` | Frontend (unused — `BASE` is hardcoded to `'/api'` in `api.ts`) | Declared but not consumed |

`VITE_API_BASE` is set in `.env` but `src/lib/api.ts` hardcodes `const BASE = '/api'` — the env var is never read. This is a dead configuration entry.

### 6.2 Deployment

- Vercel with `vercel.json` — correct SPA rewrite + API routes setup ✅
- `buildCommand: "vite build"` — works ✅
- No CI/CD pipeline — deployments are triggered by GitHub pushes to `main` via Vercel's GitHub integration

### 6.3 Secrets Management

- `DATABASE_URL` in Vercel environment variables — appropriate ✅
- No secrets in source code ✅
- `.env` in `.gitignore` — not confirmed in this audit but implied by git history showing no `.env` in repo

### 6.4 Monitoring and Observability

- **Monitoring: ABSENT** — no error tracking (Sentry, etc.), no uptime monitoring
- **Logging:** Only `console.error` in API routes — visible in Vercel function logs but not aggregated
- **Analytics:** `@vercel/analytics` installed and `<Analytics />` in `main.tsx` ✅
- No performance monitoring (no Core Web Vitals tracking beyond what Vercel provides)

### 6.5 CI/CD

- No automated tests
- No lint/typecheck in CI — merges to `main` are not gated
- Vercel auto-deploys on push — no staging environment

---

## 7. SECURITY AUDIT

### 7.1 Critical Issues

| ID | Issue | Location | Severity |
|---|---|---|---|
| S1 | No API authentication | All `/api/*` routes | Critical |
| S2 | Optimistic status mutation before tx confirms | `StreamCard.tsx:110,125,141` | High |
| S3 | Wrong keccak256 topic hash for stream ID extraction | `CreateStream.tsx:582` | High |
| S4 | `window.confirm` for destructive cancel | `StreamCard.tsx:133` | Medium |
| S5 | `stream_id` stored as `Date.now()` fallback due to S3 | `CreateStream.tsx:101` | High |
| S6 | No input sanitization on text fields stored in DB | `api/streams.ts`, `api/budgets.ts` | Medium |
| S7 | `VITE_API_BASE` unused — dead config | `.env`, `api.ts` | Low |
| S8 | `pendingWithdrawals` funds inaccessible from UI | `StreamCard.tsx` | Critical (UX) |

### 7.2 `npm audit` Status

As of last run: **1 low vulnerability** (`elliptic <=6.6.1`) — no patched version exists upstream. All high and moderate issues patched. ✅

### 7.3 Dependency Security

- `@vercel/node`: present ✅
- `pg`: no known vulns in current version ✅
- `express`, `cors`: used in `server/` (local dev only, not Vercel) — not in production attack surface

---

## 8. UX/UI AUDIT

### 8.1 Design System — Strong

- CSS custom properties with light/dark variants — consistent ✅
- Space Grotesk display font + system mono — good typographic hierarchy ✅
- Glassmorphism cards (`glass-card`, `glass-inner`) — consistent
- Category color strips — clear visual differentiation ✅
- `hover-surface` semantic token — used consistently in most places ✅
- Animated progress bars and live tickers — good for a streaming product ✅

### 8.2 UX Issues

| ID | Issue | Severity |
|---|---|---|
| UX1 | `window.confirm()` for cancel — inaccessible, unstyled | High |
| UX2 | No "Claim pending" UI after stream cancel for recipient | High |
| UX3 | Dashboard `StreamCard` has no-op `onRefresh` | Medium |
| UX4 | History has no filters and no sort controls | Medium |
| UX5 | Search only on current page (10 items), not full DB | Medium |
| UX6 | No copy-to-clipboard for addresses/tx hashes | Medium |
| UX7 | No feedback when API calls silently fail | Medium |
| UX8 | "Active" status uses Pause icon in History — semantically wrong | Low |
| UX9 | Budget progress bars always show 0% — misleading | High |
| UX10 | No way to edit budget name/limit — delete only | Medium |
| UX11 | Period selector for budgets is dead UI (`_setNewPeriod`) | Medium |
| UX12 | Mobile ToC in Docs only shows at xl — not accessible at md/lg | Low |
| UX13 | No skeleton/loading for the full Streams list on initial load | Low |

### 8.3 Accessibility

- Theme toggle has `aria-label` ✅
- Sidebar toggle has `aria-label` ✅
- Buttons have labels ✅
- **No ARIA roles** on modal-like overlays (legal modals, mobile sidebar)
- No focus trap in legal modals — keyboard users can tab out
- `window.confirm` — not accessible with screen readers
- Color-only status indicators (no text alternative in some cards)

### 8.4 Responsive Design

- Mobile sidebar with overlay — implemented ✅
- Grid breakpoints for cards (1 → 2 → 3 columns) ✅
- History table has fixed column widths — **overflows on mobile** (no horizontal scroll wrapper)
- Create Stream xl layout (form + preview side-by-side) — good
- Settings xl layout — good

---

## 9. PERFORMANCE AUDIT

### 9.1 Frontend

- **Bundle size:** `index-J5NDGbV0.js` is **1.48 MB** (460 KB gzipped) — very large. The bulk comes from wagmi/viem/connectkit and their transitive dependencies.
- No code splitting beyond what Vite generates automatically — no `React.lazy()` for any view.
- All 6 views are eagerly imported in `App.tsx`.
- `useReadContract` with `refetchInterval: 5000` on `StreamCard` — one RPC call per card every 5 seconds. With 4 cards on Dashboard, that's 4 concurrent poll chains. Acceptable for testnet.

### 9.2 API

- `GET /api/streams` issues **two queries** (SELECT + COUNT) per request. With proper indexes this is fast but a single `COUNT(*) OVER()` window function would be more efficient.
- No response caching at any layer.
- Vercel serverless cold starts on first request after idle — typically 200–800ms.

### 9.3 Database

- `streams` table has indexes on `sender_address`, `recipient_address`, `status`, `stream_id` — all the right columns for the current query patterns ✅
- No composite index on `(sender_address, status)` or `(recipient_address, status)` — multi-condition queries do a full single-column index scan + filter. For a small dataset this is fine.

---

## 10. MAINTAINABILITY AUDIT

### 10.1 Code Quality — Good

- TypeScript throughout, no `any` types observed ✅
- Consistent file structure ✅
- No circular imports apparent ✅
- `cn()` utility for conditional classnames ✅
- Semantic token usage (mostly) ✅

### 10.2 Issues

- No tests of any kind (unit, integration, e2e)
- No migration tooling — schema changes require manual DDL
- `keccak256StreamCreated` constant is wrong and never tested
- `setStreamVaultAddress` is a no-op function kept for "legacy" reasons (1 deploy) — dead code
- `users` table has no read/write path in any API or frontend
- `server/` directory (Express) duplicates `api/` directory (Vercel functions) — two implementations of the same API, potential drift
- `VITE_API_BASE` env var unused

---

## 11. FEATURE GAP ANALYSIS

### P0 — Critical

---

**P0.1 — `claimPending` UI**

*Problem:* When a sender cancels a stream, the recipient's accrued USDC is placed in `pendingWithdrawals[recipient]`. There is no UI to read this balance or call `claimPending()`. Recipients cannot access their funds.

*Who benefits:* All stream recipients.

*Proposed flow:*
1. On load, call `pendingWithdrawals(connectedAddress)` via `useReadContract`.
2. If balance > 0, show a persistent banner or card on Dashboard: "You have X USDC pending from a cancelled stream. Claim now."
3. "Claim" button calls `claimPending()` contract function.
4. On success, toast + refresh.

*Backend needed:* None (pure on-chain read + write).

---

**P0.2 — Fix `keccak256StreamCreated` topic hash**

*Problem:* The hardcoded topic hash in `CreateStream.tsx` is incorrect. Stream IDs are stored in PostgreSQL as `Date.now()` milliseconds instead of the real on-chain `streamId`. Any `balanceOf(streamId)` call from `StreamCard` using this fake ID will either revert or return data for the wrong stream.

*Fix direction:* Compute the correct keccak256 of `"StreamCreated(uint256,address,address,uint128,uint128,uint64,uint64)"` and replace the constant. Alternatively, read `nextStreamId` before and after the transaction, or parse the event using viem's `decodeEventLog`.

---

**P0.3 — DB status mutations must be post-confirmation, not pre-send**

*Problem:* `handlePause`, `handleResume`, `handleCancel` in `StreamCard.tsx` call `api.streams.update()` immediately when the button is clicked, before the transaction confirms. If the user rejects in MetaMask or the tx reverts, the DB has wrong status.

*Fix direction:* Move all `api.streams.update()` calls into the `isSuccess` effect, after `txSuccess` is confirmed. Use the transaction receipt to determine the final state.

---

### P1 — High

---

**P1.1 — Onchain Event Indexer**

*Problem:* Streams created directly via the contract (not through this UI) never appear in the DB. Stream completions (time-based) never update DB status. Withdrawal amounts are never reflected in DB.

*Proposed solution:* A background worker (Vercel cron job or a small Node.js process on a $5 VPS) that:
1. Reads `indexer_state.last_indexed_block`
2. Calls `eth_getLogs` for `StreamCreated`, `Withdrawal`, `StreamCancelled`, `StreamPaused`, `StreamResumed`, `PendingClaimed` events
3. Upserts into `streams` and `onchain_events` tables
4. Updates `indexer_state.last_indexed_block`

The schema already supports this. The `onchain_events` table has a `UNIQUE(tx_hash, log_index)` constraint for idempotency.

---

**P1.2 — API Authentication**

*Problem:* Any caller can read, write, or modify any address's stream data.

*Proposed solution:* EIP-191 signed message challenge. User signs `"StreamVault auth: <timestamp>"` → backend verifies signature → issues a short-lived JWT or session cookie. All mutating endpoints (`POST`, `PATCH`, `DELETE`) require the token.

---

**P1.3 — Budget Envelope Spend Tracking**

*Problem:* `spent_amount` is always 0. Budget progress bars are decorative.

*Fix direction:* When a stream is created (`POST /api/streams`), look up budget envelopes for the sender matching the stream's category. Increment `spent_amount += deposited_amount` for the matching budget. When a stream is cancelled, decrement by `senderRefund` amount. This requires the indexer (P1.1) or at minimum a DB trigger.

---

**P1.4 — History View Filters and Refresh Token**

*Problem:* History has no filters, no sort, and does not react to `refreshToken` (creating a stream and immediately navigating to History shows stale data).

*Fix direction:* Pass `refreshToken` to `History`. Add status/role/category filters. Add sort by amount/date toggles.

---

### P2 — Medium

---

**P2.1 — Copy-to-clipboard for addresses and tx hashes**

Every wallet address and transaction hash in the app should have a one-click copy button. Standard expectation for any Web3 app.

**P2.2 — Recipient notification / incoming stream detection**

When a user connects and has streams where they are the recipient, show a banner: "You have X active incoming streams." Currently a recipient has no way to discover they are receiving USDC unless they search for their own address.

**P2.3 — Confirmation modal for cancel (replace `window.confirm`)**

Replace with a styled modal showing the consequences: "The recipient will receive X USDC. You will be refunded Y USDC." Two buttons: Cancel stream (destructive) / Keep active.

**P2.4 — Stream detail page / modal**

A full detail view for a stream (all fields, full tx history, on-chain state vs DB state, export option). Currently only the "Details" expand panel in StreamCard, which truncates values.

**P2.5 — ENS / address book**

Allow users to save nicknames for addresses (stored in DB). Display name instead of truncated hex when available.

**P2.6 — CSV/JSON export for History**

Accountants and DAOs using this for payroll need downloadable records.

**P2.7 — Database migration tooling**

Replace `initSchema()` with a proper migration tool (Drizzle ORM or `node-pg-migrate`). This is a maintainability concern that will block any schema evolution.

---

### P3 — Nice-to-have

---

**P3.1 — Multi-stream batch creation**

Create multiple streams in one transaction (would require a multicall wrapper or contract update).

**P3.2 — Stream templates**

Save and reuse stream configurations (recipient, rate, duration, category, label) as templates.

**P3.3 — Recipient-side stream acceptance**

Allow a sender to create a "pending" stream that the recipient must accept before funds flow. Requires contract changes.

**P3.4 — Push notifications**

WebSocket or polling-based notification when a new stream is created for the connected wallet.

**P3.5 — Analytics dashboard for senders**

Charts of total USDC sent per month by category, top recipients, stream completion rates.

---

## 12. SUMMARY SCORECARD

| Dimension | Score | Notes |
|---|---|---|
| Core streaming functionality | 7/10 | Works end-to-end but stream ID bug and missing `claimPending` UI |
| Smart contract quality | 8/10 | Well-audited, good patterns; minor ABI mismatch (`getStream`) |
| Frontend architecture | 7/10 | Clean, consistent; no tests, no React Query, manual cache |
| Backend/API quality | 5/10 | Functional but no auth, no validation, no rate limiting |
| Database design | 7/10 | Good schema; no migrations, no status constraint, spent_amount unused |
| Security | 4/10 | No auth, optimistic mutations, wrong topic hash |
| UX/UI | 7/10 | Good visual design; several missing interactions |
| Infrastructure | 5/10 | Works on Vercel; no CI, no monitoring, no staging |
| Maintainability | 6/10 | Good code quality; no tests, duplicate API implementations |
| Feature completeness | 5/10 | Core flow works; indexer, auth, claimPending, budget tracking all missing |

---

*This report is read-only analysis. No code, database, or configuration changes were made. All items above are proposals for human review and decision.*
