// Contract configuration — wired after deploy
// USDC address on Arc Testnet from onchain-facts

import { getUsdc, requireChain, buildTxExplorerUrl } from '@/onchain-facts';

export const TARGET_CHAIN_ID = 5042002; // Arc Testnet

export const arcTestnetChain = requireChain(TARGET_CHAIN_ID);
export const usdcFact = getUsdc(TARGET_CHAIN_ID)!;
export const USDC_ADDRESS = usdcFact.address as `0x${string}`;
export const USDC_DECIMALS = usdcFact.decimals;

export { buildTxExplorerUrl };

// StreamVault ABI — matches deployed contract
export const STREAM_VAULT_ABI = [
  {
    "type": "constructor",
    "inputs": [{ "name": "usdcToken", "type": "address" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createStream",
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "ratePerSecond", "type": "uint128" },
      { "name": "durationSeconds", "type": "uint64" },
      { "name": "label", "type": "string" }
    ],
    "outputs": [{ "name": "streamId", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "withdrawFromStream",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelStream",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pauseStream",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resumeStream",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimPending",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [
      { "name": "recipientBalance", "type": "uint128" },
      { "name": "senderBalance", "type": "uint128" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStream",
    "inputs": [{ "name": "streamId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "id", "type": "uint256" },
          { "name": "sender", "type": "address" },
          { "name": "recipient", "type": "address" },
          { "name": "ratePerSecond", "type": "uint128" },
          { "name": "deposit", "type": "uint128" },
          { "name": "withdrawn", "type": "uint128" },
          { "name": "startTime", "type": "uint64" },
          { "name": "stopTime", "type": "uint64" },
          { "name": "pausedAt", "type": "uint64" },
          { "name": "accruedAtPause", "type": "uint128" },
          { "name": "totalPausedDuration", "type": "uint128" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextStreamId",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingWithdrawals",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint128" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "StreamCreated",
    "inputs": [
      { "name": "streamId", "type": "uint256", "indexed": true },
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "recipient", "type": "address", "indexed": true },
      { "name": "ratePerSecond", "type": "uint128" },
      { "name": "deposit", "type": "uint128" },
      { "name": "startTime", "type": "uint64" },
      { "name": "stopTime", "type": "uint64" }
    ]
  },
  {
    "type": "event",
    "name": "Withdrawal",
    "inputs": [
      { "name": "streamId", "type": "uint256", "indexed": true },
      { "name": "recipient", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint128" }
    ]
  },
  {
    "type": "event",
    "name": "StreamCancelled",
    "inputs": [
      { "name": "streamId", "type": "uint256", "indexed": true },
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "recipientPayout", "type": "uint128" },
      { "name": "senderRefund", "type": "uint128" }
    ]
  },
  {
    "type": "event",
    "name": "StreamPaused",
    "inputs": [
      { "name": "streamId", "type": "uint256", "indexed": true },
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "accruedSoFar", "type": "uint128" }
    ]
  },
  {
    "type": "event",
    "name": "StreamResumed",
    "inputs": [
      { "name": "streamId", "type": "uint256", "indexed": true },
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "newStopTime", "type": "uint64" }
    ]
  },
  {
    "type": "event",
    "name": "PendingClaimed",
    "inputs": [
      { "name": "claimant", "type": "address", "indexed": true },
      { "name": "amount", "type": "uint128" }
    ]
  },
  {
    "type": "error", "name": "StreamNotFound", "inputs": []
  },
  {
    "type": "error", "name": "NotStreamSender", "inputs": []
  },
  {
    "type": "error", "name": "NotStreamRecipient", "inputs": []
  },
  {
    "type": "error", "name": "StreamNotActive", "inputs": []
  },
  {
    "type": "error", "name": "StreamNotPaused", "inputs": []
  },
  {
    "type": "error", "name": "StreamAlreadyPaused", "inputs": []
  },
  {
    "type": "error", "name": "ZeroAddress", "inputs": []
  },
  {
    "type": "error", "name": "SenderIsRecipient", "inputs": []
  },
  {
    "type": "error", "name": "InvalidRate", "inputs": []
  },
  {
    "type": "error", "name": "InvalidDuration", "inputs": []
  },
  {
    "type": "error", "name": "NothingToWithdraw", "inputs": []
  },
  {
    "type": "error", "name": "InsufficientTransfer", "inputs": []
  }
] as const;

// Deployed on Arc Testnet
export const STREAM_VAULT_ADDRESS: `0x${string}` = '0xdf21ed361016bee04ea430f1c2d86ed9cc3b85b8';

// Legacy setter (no-op after hardcode)
export function setStreamVaultAddress(_addr: `0x${string}`) {
  // address is now hardcoded to the deployed contract
}

export const ERC20_APPROVE_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
] as const;
