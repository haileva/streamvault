# StreamVault — Smart Contract Reference

---

## Deployment

| Property | Value |
|---|---|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Address | `0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8` |
| Explorer | https://explorer.testnet.arc.io/address/0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8 |
| Compiler | Solidity 0.8.20 |
| Optimizer | Foundry default |
| OpenZeppelin | 5.x |

---

## Overview

`StreamVault` is a non-upgradeable USDC streaming vault. Senders deposit USDC once and it flows linearly per second to recipients. The contract enforces:

- Linear time-based accrual (no off-by-one: paused time is excluded)
- Pull-based withdrawals (recipients pull at any time)
- Pull-based cancel payouts (recipient's share goes to `pendingWithdrawals`, not a push transfer)
- Reentrancy protection on all state-mutating functions
- Balance-delta check on deposit (fee-on-transfer safe)

---

## Audit History

| Finding | Severity | Status |
|---|---|---|
| Paused time still accrues (pause/resume did not stop accrual) | High | Fixed — added `totalPausedDuration` |
| Cancel can be bricked by blocklisted recipient (push payout) | Critical | Fixed — converted to pull via `pendingWithdrawals` |
| Fee-on-transfer accounting (recorded nominal deposit before receipt) | High | Fixed — balance-delta check, reverts with `InsufficientTransfer()` |

---

## Data Structures

### `StreamStatus` (enum)
```
Active     — streaming, accrual running
Paused     — no accrual, sender can resume
Cancelled  — stopped, payouts split into pendingWithdrawals + direct refund
Completed  — all funds withdrawn
```

### `Stream` (struct)

| Field | Type | Description |
|---|---|---|
| `id` | `uint256` | Stream ID (auto-increment from `nextStreamId`) |
| `sender` | `address` | Address that created and funded the stream |
| `recipient` | `address` | Address that accrues and can withdraw |
| `ratePerSecond` | `uint128` | USDC (6 decimals) per second |
| `deposit` | `uint128` | Actual received deposit (balance-delta, fee-on-transfer safe) |
| `withdrawn` | `uint128` | Cumulative amount withdrawn by recipient |
| `startTime` | `uint64` | `block.timestamp` at creation |
| `stopTime` | `uint64` | `startTime + deposit/ratePerSecond`; extended on each resume |
| `pausedAt` | `uint64` | Timestamp when stream was paused (0 if not paused) |
| `accruedAtPause` | `uint128` | Snapshot of `_accruedAmount` at pause/cancel time |
| `totalPausedDuration` | `uint128` | Cumulative paused seconds (subtracted in accrual math) |
| `status` | `StreamStatus` | Current stream state |

---

## State Variables

| Variable | Type | Description |
|---|---|---|
| `usdc` | `IERC20 immutable` | USDC token address (set at construction) |
| `nextStreamId` | `uint256` | Auto-increment counter, starts at 1 |
| `streams` | `mapping(uint256 => Stream)` | All streams by ID |
| `streamLabels` | `mapping(uint256 => string)` | Human-readable label per stream |
| `pendingWithdrawals` | `mapping(address => uint128)` | Pull-based balances for cancelled stream payouts |

---

## Functions

### `createStream`
```solidity
function createStream(
    address recipient,
    uint128 ratePerSecond,
    uint64 durationSeconds,
    string calldata label
) external nonReentrant returns (uint256 streamId)
```

**Requires:**
- `recipient` is non-zero and not `msg.sender`
- `ratePerSecond > 0`
- `0 < durationSeconds <= 3650 days`
- `deposit = ratePerSecond * durationSeconds` fits in `uint128`
- Received balance delta equals nominal deposit (reverts `InsufficientTransfer` otherwise)

**Effect:** transfers `deposit` USDC from `msg.sender`, creates a `Stream` record, emits `StreamCreated`.

**Note:** `stopTime = startTime + received / ratePerSecond`. If `received < nominal` (fee-on-transfer token), the contract reverts rather than creating an undercollateralized stream.

---

### `withdrawFromStream`
```solidity
function withdrawFromStream(uint256 streamId) external nonReentrant
```

**Requires:** `msg.sender == stream.recipient`, stream is not Cancelled, claimable > 0.

**Effect:** computes `_claimable`, increments `stream.withdrawn`, optionally marks Completed, transfers USDC to recipient.

---

### `cancelStream`
```solidity
function cancelStream(uint256 streamId) external nonReentrant
```

**Requires:** `msg.sender == stream.sender`, stream is Active or Paused.

**Effect:**
- Computes accrued amount at cancellation timestamp
- `recipientPayout = accrued - withdrawn` → added to `pendingWithdrawals[recipient]`
- `senderRefund = deposit - accrued` → direct transfer to sender
- Marks stream Cancelled
- Emits `StreamCancelled`

**Why pull for recipient:** If the recipient is on Arc's USDC blocklist, a push transfer would revert and permanently lock the sender's refund. The pull pattern isolates failures.

---

### `pauseStream`
```solidity
function pauseStream(uint256 streamId) external
```

**Requires:** `msg.sender == stream.sender`, stream is Active.

**Effect:** snapshots `accruedAtPause = _accruedAmount(stream)`, sets `pausedAt = block.timestamp`, sets status to Paused.

---

### `resumeStream`
```solidity
function resumeStream(uint256 streamId) external
```

**Requires:** `msg.sender == stream.sender`, stream is Paused.

**Effect:**
- `pausedDuration = now - pausedAt`
- `stopTime += pausedDuration` (extends the stream by the paused time)
- `totalPausedDuration += pausedDuration` (used in accrual math)
- Clears `pausedAt`, sets status Active

---

### `claimPending`
```solidity
function claimPending() external nonReentrant
```

Allows any address to claim their `pendingWithdrawals` balance (populated by `cancelStream`). Clears the balance before transferring (CEI pattern).

---

### `balanceOf`
```solidity
function balanceOf(uint256 streamId) external view
    returns (uint128 recipientBalance, uint128 senderBalance)
```

Returns live claimable balance for recipient (`accrued - withdrawn`) and remaining deposit for sender (`deposit - accrued`). Both are 0 for Cancelled streams.

---

## Accrual Math (`_accruedAmount`)

```
if Paused or Cancelled:
    return accruedAtPause

if Completed:
    return deposit

effectiveEnd = min(block.timestamp, stopTime)
if effectiveEnd <= startTime:
    return 0

elapsed = effectiveEnd - startTime - totalPausedDuration
if elapsed <= 0:
    return 0

accrued = elapsed * ratePerSecond
return min(accrued, deposit)
```

Key invariant: **paused time never accrues value**. `totalPausedDuration` accumulates across multiple pause/resume cycles.

---

## Events

| Event | Emitted By | Fields |
|---|---|---|
| `StreamCreated` | `createStream` | `streamId`, `sender`, `recipient`, `ratePerSecond`, `deposit`, `startTime`, `stopTime` |
| `Withdrawal` | `withdrawFromStream` | `streamId`, `recipient`, `amount` |
| `StreamCancelled` | `cancelStream` | `streamId`, `sender`, `recipientPayout`, `senderRefund` |
| `StreamPaused` | `pauseStream` | `streamId`, `sender`, `accruedSoFar` |
| `StreamResumed` | `resumeStream` | `streamId`, `sender`, `newStopTime` |
| `PendingClaimed` | `claimPending` | `claimant`, `amount` |

---

## Custom Errors

| Error | Thrown When |
|---|---|
| `StreamNotFound` | Stream ID has no sender |
| `NotStreamSender` | Caller is not the stream sender |
| `NotStreamRecipient` | Caller is not the stream recipient |
| `StreamNotActive` | Operation requires Active status |
| `StreamNotPaused` | Resume called on non-paused stream |
| `StreamAlreadyPaused` | Pause called on already-paused stream |
| `ZeroAddress` | Zero address passed as recipient or USDC token |
| `SenderIsRecipient` | Sender and recipient are the same address |
| `InvalidRate` | Rate is 0 or deposit overflows uint128 |
| `InvalidDuration` | Duration is 0 or exceeds 3650 days |
| `NothingToWithdraw` | Claimable or pending balance is 0 |
| `InsufficientTransfer` | Received less than expected (fee-on-transfer guard) |

---

## Build & Test

```bash
# Build
bun run contracts:build    # runs: forge build

# Test
bun run contracts:test     # runs: forge test

# File locations
contracts/StreamVault.sol          # source
contracts/test/*.t.sol             # Foundry unit tests
contracts/out/StreamVault.sol/     # compiled artifacts
```

---

## Frontend ABI Integration

The frontend reads the contract via wagmi hooks. The ABI is inlined in `src/lib/contracts.ts`:

```ts
import { STREAM_VAULT_ABI } from '@/lib/contracts';
import { STREAM_VAULT_ADDRESS } from '@/onchain-facts';

// Read
const { data } = useReadContract({
  address: STREAM_VAULT_ADDRESS,
  abi: STREAM_VAULT_ABI,
  functionName: 'balanceOf',
  args: [streamId],
});

// Write
const { writeContract } = useWriteContract();
writeContract({
  address: STREAM_VAULT_ADDRESS,
  abi: STREAM_VAULT_ABI,
  functionName: 'withdrawFromStream',
  args: [streamId],
});
```
