import type { PublicClient } from 'viem';
import { ADDRS, CURVE_IDX } from './addresses';
import { CURVE_POOL_ABI } from './abi';

// Curve PYUSD → USDC quote.
export async function quoteCurvePyusdToUsdc(client: PublicClient, dxPyusd: bigint): Promise<bigint> {
  if (dxPyusd === 0n) return 0n;
  return await client.readContract({
    address: ADDRS.CURVE_PYUSD_USDC,
    abi: CURVE_POOL_ABI,
    functionName: 'get_dy',
    args: [BigInt(CURVE_IDX.PYUSD), BigInt(CURVE_IDX.USDC), dxPyusd],
  });
}

export async function quoteCurveUsdcToPyusd(client: PublicClient, dxUsdc: bigint): Promise<bigint> {
  if (dxUsdc === 0n) return 0n;
  return await client.readContract({
    address: ADDRS.CURVE_PYUSD_USDC,
    abi: CURVE_POOL_ABI,
    functionName: 'get_dy',
    args: [BigInt(CURVE_IDX.USDC), BigInt(CURVE_IDX.PYUSD), dxUsdc],
  });
}

// Apply a slippage tolerance (bps) downward to a quote.
export function applySlippage(quote: bigint, slippageBps: number): bigint {
  const factor = BigInt(10_000 - slippageBps);
  return (quote * factor) / 10_000n;
}
