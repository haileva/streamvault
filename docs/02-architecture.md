# StreamVault — Architecture

---

## System Diagram

```
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
```

---

## Layers

### 1. Frontend (src/)

**Entry:** `src/main.tsx` — wraps the app in `WagmiProvider`, `QueryClientProvider`, `ConnectKitProvider`, `ThemeProvider`, and Sonner `Toaster`.

**App shell:** `src/App.tsx` — thin composition root. Holds `view` state, renders `<Layout>` with the active view component.

**Views** (`src/views/`):

| View | File | Purpose |
|---|---|---|
| Dashboard | `Dashboard.tsx` | Stats, active streams summary, CTA cards |
| Streams | `Streams.tsx` | Filterable, paginated stream card grid |
| Create Stream | `CreateStream.tsx` | 2-step form: approve USDC → create stream |
| History | `History.tsx` | Compact table of all streams |
| Settings | `Settings.tsx` | Wallet info, contract address, budget envelopes |

**Shared components** (`src/components/`):

| Component | Purpose |
|---|---|
| `Layout.tsx` | Sidebar + topbar shell, theme toggle, sidebar collapse state |
| `StreamCard.tsx` | Stream card with live per-second ticker, action buttons |
| `Footer.tsx` | Dark footer with brand, links, bottom bar |

**Utility modules** (`src/lib/`):

| Module | Purpose |
|---|---|
| `api.ts` | Typed fetch wrappers for all backend endpoints |
| `utils.ts` | `cn()`, `formatUSDC()`, `formatTs()`, `rateToMonthly()`, `formatAddress()`, `categoryColor()` |
| `theme.tsx` | `ThemeProvider`, `useTheme()` hook, `localStorage` persistence |

**Onchain modules** (`src/`):

| Module | Purpose |
|---|---|
| `onchain-facts.ts` | Chain IDs, RPC URLs, USDC addresses, contract addresses — never hardcode, import from here |
| `onchain-money.ts` | `parseUsdc`, `formatUsdc`, `usdcToGasToken`, `gasTokenToUsdc` — all decimal math goes through here |
| `onchain-wait.ts` | Terminal state machine + poll loop for transaction status |

---

### 2. Backend (server/)

**Entry:** `server/index.ts` — Express 5 app, mounts routes, starts on port 3001.

**Routes:**

| Prefix | File | Endpoints |
|---|---|---|
| `/streams` | `routes/streams.ts` | `GET /` (list), `GET /:id`, `POST /`, `PATCH /:id` |
| `/budgets` | `routes/budgets.ts` | `GET /`, `POST /`, `DELETE /:id` |
| `/stats` | `routes/stats.ts` | `GET /` (dashboard summary) |
| `/health` | inline | `GET /health` — `{ ok: true }` |

**Database:** `server/db.ts` — exports a `pg.Pool` and an `initSchema()` function that runs `CREATE TABLE IF NOT EXISTS` for all 5 tables.

The Vite dev server proxies `/api/*` → `http://localhost:3001/*` (configured in `vite.config.ts`).

---

### 3. Database (PostgreSQL)

**Connection:** `DATABASE_URL` env var (Docker: `postgresql://streamvault:streamvault@localhost:5432/streamvault`).

**Tables:**

| Table | Purpose |
|---|---|
| `users` | Wallet address → display name, created_at |
| `streams` | Offchain mirror of onchain streams + metadata (label, category, status) |
| `budget_envelopes` | Sender-defined spend categories with monthly limit and spent tracking |
| `onchain_events` | Raw decoded events from the contract (StreamCreated, Withdrawal, etc.) |
| `indexer_state` | Single-row cursor: `last_indexed_block` for the event sync process |

**Schema source of truth:** `server/db.ts` `initSchema()` function.

---

### 4. Smart Contract (contracts/)

**Source:** `contracts/StreamVault.sol`  
**Framework:** Foundry (`forge build`, `forge test`)  
**Dependencies:** OpenZeppelin 5.x (`IERC20`, `SafeERC20`, `ReentrancyGuard`)

See [03-smart-contract.md](./03-smart-contract.md) for the full contract reference.

---

## Data Flow: Creating a Stream

```
User fills form
     │
     ▼
CreateStream.tsx
     │
     ├─ Step 1: useWriteContract → USDC.approve(StreamVault, amount)
     │         Wait for tx confirmation
     │
     ├─ Step 2: useWriteContract → StreamVault.createStream(recipient, rate, duration, label)
     │         Wait for tx confirmation
     │
     └─ Step 3: POST /api/streams  ← save offchain record with onchain stream ID
```

## Data Flow: Viewing Streams

```
Streams.tsx mounts
     │
     ├─ fetch GET /api/streams?sender=0x...  ← Express → PostgreSQL
     │   (fast, no RPC needed)
     │
     └─ For each card:
          └─ useContractRead → StreamVault.balanceOf(streamId)
              (live claimable balance from chain every 5s)
```

## Data Flow: Withdrawing

```
StreamCard "Withdraw" button
     │
     └─ useWriteContract → StreamVault.withdrawFromStream(streamId)
          │
          └─ On success → PATCH /api/streams/:id { status: 'completed' }
               + toast notification
```

---

## Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `VITE_API_BASE` | Frontend | API base URL (defaults to `/api` via proxy) |
| `RPC_PROXY_BASE_URL` | Backend (optional) | Arc Studio managed RPC proxy base |
| `RPC_PROXY_TOKEN` | Backend (optional) | RPC proxy auth token |
| `RPC_PROXY_CHAINS` | Backend (optional) | Comma-separated chain keys for proxy |

---

## Security Boundaries

- Contract is the canonical source of financial truth. The PostgreSQL layer is a read-optimized mirror and application metadata store — it is never trusted for fund amounts.
- All USDC transfers go through the contract. The backend has no private keys and no signing capability.
- USDC approval is scoped to the exact deposit amount per stream creation — no unlimited approvals in the UI.
- Contract uses `SafeERC20`, `ReentrancyGuard`, and pull-based payouts for cancel.
