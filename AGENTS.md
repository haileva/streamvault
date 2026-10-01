# StreamVault

> Built with Arc Studio - money-powered apps in minutes

StreamVault is a USDC streaming payment platform on Arc Testnet. Senders deposit USDC once, and it flows continuously per-second to recipients. Supports payroll, subscriptions, retainers, and grants. Pull-based withdrawals, pause/resume, cancel with pull-based payout for blocklist safety.

---

## Deployed Contracts

| Contract | Network | Address | Explorer |
|---|---|---|---|
| StreamVault | Arc Testnet | 0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8 | https://explorer.testnet.arc.io/address/0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8 |

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind (src/)
- **Backend**: Express API on :3001, proxied via /api (server/)
- **Database**: PostgreSQL via Docker (streamvault-pg:5432, DB: streamvault)
- **Contract**: StreamVault.sol — USDC streaming vault, time-based accrual, pause/resume, cancel
- **Onchain**: Arc Testnet, USDC = 0x3600000000000000000000000000000000000000

## What This App Does

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
