# StreamVault — Development Workflow

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [Foundry](https://book.getfoundry.sh) (for contract work)
- [Docker](https://docker.com) (for local PostgreSQL)
- Node.js >= 20 (for Circle CLI, not for the app runtime)

### Setup

```bash
# 1. Clone
git clone https://github.com/haileva/streamvault
cd streamvault

# 2. Install dependencies
bun install

# 3. Set up environment (copy and fill in DATABASE_URL)
cp .env.example .env

# 4. Start PostgreSQL (Docker)
docker run -d \
  --name streamvault-pg \
  -e POSTGRES_USER=streamvault \
  -e POSTGRES_PASSWORD=streamvault \
  -e POSTGRES_DB=streamvault \
  -p 5432:5432 \
  postgres:18-alpine

# 5. Start the backend (runs schema migration on first start)
bun run server

# 6. Start the frontend (separate terminal)
bun run dev
```

The app will be available at `http://localhost:5173`. The backend API is at `http://localhost:3001`, proxied through Vite at `/api`.

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `bun run dev` | `vite` | Start Vite dev server with HMR |
| `bun run server` | `bun run server/index.ts` | Start Express API server |
| `bun run check` | `bash scripts/check.sh` | Run oxlint + TypeScript check |
| `bun run contracts:build` | `forge build` | Compile Solidity contracts |
| `bun run contracts:test` | `forge test` | Run Foundry unit tests |
| `bun run typecheck` | `tsc --noEmit` | TypeScript type check only |
| `bun run lint` | `oxlint ...` | Lint + auto-fix |

---

## Git Workflow

### Branch Strategy

```
main            — production-ready code, always deployable
feat/<name>     — new features
fix/<name>      — bug fixes
refactor/<name> — refactors without behavior change
docs/<name>     — documentation only
security/<name> — dependency or security fixes
```

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting, whitespace, CSS-only changes |
| `docs` | Documentation only |
| `security` | Security / dependency fix |
| `chore` | Tooling, config, CI changes |
| `test` | Adding or fixing tests |

**Examples:**

```
feat(streams): add xl:grid-cols-3 layout for Full HD screens
fix(footer): restore missing </div> closing tag in grid container
security: add overrides to resolve 24/25 transitive dep vulnerabilities
docs: add full project documentation in docs/
style(layout): align sidebar logo border with topbar (both h-16)
refactor(theme): replace hover:bg-black/5 with hover-surface CSS class
```

---

## Quality Gates

Every push to `main` must pass:

### 1. Lint + Typecheck
```bash
bun run check
# Required: 0 errors (warnings acceptable for pre-approved patterns)
```

### 2. Contract Build (if contracts changed)
```bash
bun run contracts:build
# Required: no compilation errors
```

### 3. Contract Tests (if contract logic changed)
```bash
bun run contracts:test
# Required: all tests pass
```

### 4. Production Build
```bash
bunx vite build
# Required: successful build, no errors
```

---

## Contract Development Workflow

### Write → Audit → Test → Deploy

1. **Write:** Modify `contracts/StreamVault.sol`
2. **Build:** `bun run contracts:build`
3. **Security audit:** Run both the rule-corpus auditor and the functional auditor
4. **Fix:** Apply all Critical/High findings before proceeding
5. **Unit tests:** Write and run `contracts/test/*.t.sol`
6. **Deploy:** `bun run compass:deploy` (uses Circle SCP) or deploy via the contracts skill
7. **Wire:** Update `VITE_STREAM_VAULT_ADDRESS` in `.env`
8. **Update `AGENTS.md`:** Record the new address and network

### Audit Severity Policy

| Severity | Policy |
|---|---|
| Critical | Must fix before deploy |
| High | Must fix before deploy |
| Medium | Must fix or document accepted risk before deploy |
| Low | Fix where practical; document if deferring |
| Info | No action required |

---

## Frontend Development Workflow

### Adding a New View

1. Create `src/views/MyView.tsx`
2. Add to `type View` in `src/components/Layout.tsx`
3. Add to `PAGE_TITLES` in `Layout.tsx`
4. Add a nav item to `NAV` in `Layout.tsx`
5. Add the route case in `src/App.tsx`
6. Run `bun run check` before committing

### Adding a New API Endpoint

1. Add the route handler in `server/routes/<entity>.ts`
2. Mount in `server/index.ts`
3. Add a typed fetch wrapper in `src/lib/api.ts`
4. Update the relevant view to use the new endpoint

### Adding a New CSS Variable

1. Add to `:root {}` in `src/index.css` (light value)
2. Add matching override to `.dark {}` (dark value)
3. Document in `docs/04-design-system.md` under the relevant token table

---

## Debugging

### Frontend errors
```bash
# Browser console output is captured to:
cat /home/user/app/console.jsonl

# Network/RPC traces:
cat /home/user/app/traces.jsonl
```

### Backend errors
```bash
tail -50 /tmp/backend.log
```

### Database
```bash
# Connect to the running container
docker exec -it streamvault-pg psql -U streamvault -d streamvault

# Check tables
\dt

# Check streams
SELECT id, sender, recipient, status, rate_per_second FROM streams LIMIT 10;
```

### Contract
```bash
# View deployed contract
open https://explorer.testnet.arc.io/address/0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8

# Run tests with verbose output
forge test -vvv
```

---

## Dependency Management

### Adding Dependencies

```bash
bun add <package>           # runtime dependency
bun add -d <package>        # dev dependency
```

Pre-installed packages (do not add again):
`react`, `react-dom`, `viem`, `wagmi`, `connectkit`, `@tanstack/react-query`, `framer-motion`, `lucide-react`, `sonner`, `tailwind-merge`, `clsx`, `@circle-fin/*`, `@openzeppelin/contracts`

### Security Audits

```bash
bun audit
```

After adding or updating dependencies, run `bun audit` and check for new vulnerabilities.  
Use `overrides` in `package.json` to force patched versions of transitive dependencies.  
**Never use `--force` without verifying compatibility.** See the security audit trail in git history for examples.

Current status: 1 remaining low-severity vulnerability in `elliptic` (no upstream patch available).

---

## Deployment

### Testnet (Arc Testnet)

The app is designed and tested for Arc Testnet only. Deployment uses Circle Smart Contract Platform (SCP).

```bash
# Deploy contract
bun run compass:deploy

# Or deploy frontend to Netlify / Hugging Face
# → Connect via Arc Studio sidebar → "deploy this"
```

### Mainnet

Mainnet deployment requires:
1. Independent security audit of the smart contract
2. Review of all wallet addresses, contract addresses, and chain IDs
3. Deployment from your own wallet with your own credentials
4. Arc Studio does not deploy to mainnet on your behalf

---

## Environment Setup Reference

```bash
# .env (never commit this file)
DATABASE_URL=postgresql://streamvault:streamvault@localhost:5432/streamvault
VITE_API_BASE=/api

# Optional: Arc Studio RPC proxy (auto-provisioned in Arc Studio sandbox)
RPC_PROXY_BASE_URL=
RPC_PROXY_TOKEN=
RPC_PROXY_CHAINS=Arc_Testnet

# Contract address (set after deploy)
VITE_STREAM_VAULT_ADDRESS=0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8
```

`.env` is in `.gitignore` and must never be committed.
