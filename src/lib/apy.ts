import type { Address, PublicClient } from 'viem';
import { ADDRS } from './addresses';
import { STAKING_VAULT_ABI } from './abi';

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

// Compute PRIME APY from the change in getVerifiedNav over a lookback window.
// Uses the public RPC's archive-state support (most public RPCs support recent blocks).
// Falls back to a known-good rate if archive read fails.
export async function readPrimeApyFromNav(
  client: PublicClient,
  lookbackSeconds = 3 * 24 * 60 * 60,
): Promise<{ apy: number; source: 'live' | 'fallback'; navNow: bigint; navPast?: bigint; dtSeconds?: number }> {
  const FALLBACK_APY = 0.0738;
  const nowBlock = await client.getBlockNumber();
  const block = await client.getBlock({ blockNumber: nowBlock });
  const nowTs = Number(block.timestamp);
  // ~12s per block on mainnet.
  const blocksBack = BigInt(Math.floor(lookbackSeconds / 12));
  const pastBlockNumber = nowBlock - blocksBack;

  const navNow = await client.readContract({
    address: ADDRS.PRIME as Address,
    abi: STAKING_VAULT_ABI,
    functionName: 'getVerifiedNav',
  });

  try {
    const pastBlock = await client.getBlock({ blockNumber: pastBlockNumber });
    const navPast = await client.readContract({
      address: ADDRS.PRIME as Address,
      abi: STAKING_VAULT_ABI,
      functionName: 'getVerifiedNav',
      blockNumber: pastBlockNumber,
    });
    const dtSeconds = nowTs - Number(pastBlock.timestamp);
    if (navPast === 0n || dtSeconds <= 0) {
      return { apy: FALLBACK_APY, source: 'fallback', navNow };
    }
    const growth = Number(navNow - navPast) / Number(navPast);
    const annualised = (growth * SECONDS_PER_YEAR) / dtSeconds;
    if (!Number.isFinite(annualised) || annualised < -0.5 || annualised > 1.0) {
      return { apy: FALLBACK_APY, source: 'fallback', navNow };
    }
    return { apy: annualised, source: 'live', navNow, navPast, dtSeconds };
  } catch {
    return { apy: FALLBACK_APY, source: 'fallback', navNow };
  }
}
