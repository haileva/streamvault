# StreamVault — Project Overview

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
- **Pause / Resume** — sender can pause a stream; paused time is excluded from accrual (no value lost for either party)
- **Cancel with pull-based payout** — cancel splits the deposit fairly; recipient's share goes into a `pendingWithdrawals` mapping to avoid blocklist-induced lockups
- **Recipient withdraws anytime** — no waiting for the stream to end
- **Audited** — three findings fixed before deploy (paused-time accrual, cancel bricking, fee-on-transfer accounting)
- **Deployed** — `0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8` on Arc Testnet

### Offchain
- **PostgreSQL backend** — streams, budget envelopes, onchain events, and an indexer cursor table are persisted offchain for instant queries and analytics
- **Express REST API** — proxied through Vite, CRUD for streams, budget envelopes, and stats
- **Budget envelopes** — sender-side spend tracking per category (payroll, subscriptions, grants, etc.)
- **Onchain event indexer** — syncs `StreamCreated`, `Withdrawal`, `StreamCancelled`, `StreamPaused`, `StreamResumed` events into PostgreSQL

### Frontend
- **5-view SPA** — Dashboard, Streams, Create Stream, History, Settings
- **Light / Dark theme** — CSS variable-based, persisted to `localStorage`, no flash on load
- **Collapsible sidebar** — icon-only rail mode on desktop, slide-over on mobile
- **Full HD responsive** — `max-w-[1440px]` content, XL breakpoint grids (3-col streams, 2-col forms)
- **ConnectKit wallet connection** — supports MetaMask, injected wallets, WalletConnect

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
| Token | USDC — `0x3600000000000000000000000000000000000000` |

---

## Network

| Property | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Native gas | USDC (18-decimal native view, 6-decimal ERC-20 view) |
| Finality | Sub-second |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` |

---

## Repository

`https://github.com/haileva/streamvault`

---

## Status

- Contract: **deployed and audited**
- Frontend: **production-ready**
- Backend: **running**
- Database: **migrated (all 5 tables live)**
- Security: **24/25 transitive vulnerabilities resolved**
