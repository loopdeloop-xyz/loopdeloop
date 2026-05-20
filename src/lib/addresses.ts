import type { Address, Hex } from 'viem';

// Ethereum mainnet. All addresses EIP-55 checksummed.
export const ADDRS = {
  PRIME: '0x19ebb35279A16207Ec4ba82799CC64715065F7F6',
  wYLDS: '0x6aD038cA6C04e885630851278ca0a856Ad9a66Cc',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  PYUSD: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',

  MORPHO: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  ORACLE_PRIME_PYUSD: '0x335e5718bC20028d5e357473a3736C187Ca6b07e',
  IRM_ADAPTIVE: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',

  BUNDLER3: '0x6566194141eefa99Af43Bb5Aa71460Ca2Dc90245',
  GENERAL_ADAPTER_1: '0x4A6c312ec70E8747a587EE860a0353cd42Be0aE0',

  CURVE_PYUSD_USDC: '0x383E6b4437b59fff47B619CBA855CA29342A8559',

  UNI_V3_SWAP_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  UNI_V3_QUOTER_V2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
} as const satisfies Record<string, Address>;

export const MARKET_ID =
  '0x41c41d0c9aadbf4751f5ee215ed5a16954a4b34e1b70fca5393d4b08858fa3fa' as Hex;

export const MARKET_PARAMS = {
  loanToken: ADDRS.PYUSD as Address,
  collateralToken: ADDRS.PRIME as Address,
  oracle: ADDRS.ORACLE_PRIME_PYUSD as Address,
  irm: ADDRS.IRM_ADAPTIVE as Address,
  lltv: 860000000000000000n,
} as const;

export const DEC = {
  USDC: 6,
  PYUSD: 6,
  wYLDS: 6,
  PRIME: 6,
} as const;

export const CURVE_IDX = {
  PYUSD: 0,
  USDC: 1,
} as const;

export const UNI_V3_PRIME_USDC_FEE = 100;

// Configured at build time via NEXT_PUBLIC_FEE_RECIPIENT in .env.local.
// Deliberately not hardcoded so the literal isn't committed to the public repo.
function readFeeRecipient(): Address {
  const raw = process.env.NEXT_PUBLIC_FEE_RECIPIENT;
  if (!raw || !/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    throw new Error(
      'NEXT_PUBLIC_FEE_RECIPIENT must be set to a 0x-prefixed Ethereum address',
    );
  }
  return raw as Address;
}

export const FEE_RECIPIENT = readFeeRecipient();

export const FEE_BPS = 100n;
