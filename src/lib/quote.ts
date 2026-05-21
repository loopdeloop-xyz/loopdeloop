import type { Address, PublicClient } from 'viem';
import { ADDRS, CURVE_IDX, UNI_V3_PRIME_USDC_FEE } from './addresses';
import { CURVE_POOL_ABI, UNI_V3_QUOTER_ABI } from './abi';

// ============================================================
// Curve PYUSD/USDC quotes (StableSwap NG)
// ============================================================

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

// ============================================================
// Uniswap V3 PRIME/USDC quotes (0.01% fee tier)
// ============================================================

export interface UniQuote {
  amountOut: bigint;
  priceImpactBps: number;
}

// Spot price is read from the most recent NAV-aligned quote at small size,
// then compared to the user's size for impact estimation.
async function quoteExactInputSingle(
  client: PublicClient,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
): Promise<bigint> {
  if (amountIn === 0n) return 0n;
  const { result } = await client.simulateContract({
    address: ADDRS.UNI_V3_QUOTER_V2,
    abi: UNI_V3_QUOTER_ABI,
    functionName: 'quoteExactInputSingle',
    args: [{
      tokenIn,
      tokenOut,
      amountIn,
      fee: UNI_V3_PRIME_USDC_FEE,
      sqrtPriceLimitX96: 0n,
    }],
  });
  return result[0];
}

export async function quoteUniV3PrimeToUsdc(client: PublicClient, primeAmount: bigint): Promise<UniQuote> {
  if (primeAmount === 0n) return { amountOut: 0n, priceImpactBps: 0 };
  // 1 PRIME spot quote (small reference).
  const spotIn = 10n ** 6n; // 1 PRIME
  const [actualOut, refOut] = await Promise.all([
    quoteExactInputSingle(client, ADDRS.PRIME, ADDRS.USDC, primeAmount),
    quoteExactInputSingle(client, ADDRS.PRIME, ADDRS.USDC, spotIn),
  ]);
  // Expected if no impact: primeAmount * refOut / spotIn.
  const expected = (primeAmount * refOut) / spotIn;
  const impactBps = expected > 0n
    ? Number(((expected - actualOut) * 10_000n) / expected)
    : 0;
  return { amountOut: actualOut, priceImpactBps: Math.max(0, impactBps) };
}

export async function quoteUniV3UsdcToPrime(client: PublicClient, usdcAmount: bigint): Promise<UniQuote> {
  if (usdcAmount === 0n) return { amountOut: 0n, priceImpactBps: 0 };
  const spotIn = 10n ** 6n;
  const [actualOut, refOut] = await Promise.all([
    quoteExactInputSingle(client, ADDRS.USDC, ADDRS.PRIME, usdcAmount),
    quoteExactInputSingle(client, ADDRS.USDC, ADDRS.PRIME, spotIn),
  ]);
  const expected = (usdcAmount * refOut) / spotIn;
  const impactBps = expected > 0n
    ? Number(((expected - actualOut) * 10_000n) / expected)
    : 0;
  return { amountOut: actualOut, priceImpactBps: Math.max(0, impactBps) };
}

// Apply a downside slippage tolerance (bps) to a quoted output.
export function applySlippage(quote: bigint, slippageBps: number): bigint {
  if (slippageBps <= 0) return quote;
  const factor = BigInt(10_000 - slippageBps);
  return (quote * factor) / 10_000n;
}

// Apply an upside slippage tolerance (bps) to a quoted INPUT (for exact-out style sizing).
export function inflateForSlippage(input: bigint, slippageBps: number): bigint {
  if (slippageBps <= 0) return input;
  const factor = BigInt(10_000 + slippageBps);
  return (input * factor) / 10_000n;
}
