'use client';

import {
  type Address,
  type Hex,
  type WalletClient,
  parseSignature,
} from 'viem';
import { ADDRS } from './addresses';
import { ERC20_ABI, MORPHO_ABI } from './abi';
import { publicClient } from './viem';

const MAINNET_ID = 1;

// EIP-2612 USDC permit signature.
export async function signUsdcPermit(
  wallet: WalletClient,
  owner: Address,
  spender: Address,
  value: bigint,
  deadline: bigint,
): Promise<{ v: number; r: Hex; s: Hex; nonce: bigint }> {
  const [nonce, name, version] = await Promise.all([
    publicClient.readContract({ address: ADDRS.USDC as Address, abi: ERC20_ABI, functionName: 'nonces', args: [owner] }),
    publicClient.readContract({ address: ADDRS.USDC as Address, abi: ERC20_ABI, functionName: 'name' }),
    publicClient.readContract({ address: ADDRS.USDC as Address, abi: ERC20_ABI, functionName: 'version' }),
  ]);

  const sig = await wallet.signTypedData({
    account: owner,
    domain: {
      name,
      version,
      chainId: MAINNET_ID,
      verifyingContract: ADDRS.USDC as Address,
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit',
    message: { owner, spender, value, nonce, deadline },
  });

  const parts = parseSignature(sig);
  return { v: Number(parts.v ?? (parts.yParity === 0 ? 27 : 28)), r: parts.r, s: parts.s, nonce };
}

// Morpho Blue setAuthorizationWithSig signature.
// Domain matches Morpho Blue mainnet singleton.
export async function signMorphoAuth(
  wallet: WalletClient,
  authorizer: Address,
  authorized: Address,
  isAuthorized: boolean,
  deadline: bigint,
): Promise<{ v: number; r: Hex; s: Hex; nonce: bigint }> {
  const nonce = await publicClient.readContract({
    address: ADDRS.MORPHO as Address,
    abi: MORPHO_ABI,
    functionName: 'nonce',
    args: [authorizer],
  });

  const sig = await wallet.signTypedData({
    account: authorizer,
    domain: {
      chainId: MAINNET_ID,
      verifyingContract: ADDRS.MORPHO as Address,
    },
    types: {
      Authorization: [
        { name: 'authorizer', type: 'address' },
        { name: 'authorized', type: 'address' },
        { name: 'isAuthorized', type: 'bool' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Authorization',
    message: { authorizer, authorized, isAuthorized, nonce, deadline },
  });

  const parts = parseSignature(sig);
  return { v: Number(parts.v ?? (parts.yParity === 0 ? 27 : 28)), r: parts.r, s: parts.s, nonce };
}
