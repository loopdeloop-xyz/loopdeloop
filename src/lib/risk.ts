import { MARKET_PARAMS } from './addresses';

const WAD = 10n ** 18n;
const RAY = 10n ** 27n;

/**
 * Liquidation NAV: the PRIME→PYUSD oracle price at which the position becomes
 * exactly liquidatable (HF = 1).
 *
 * HF = (collateral × price × lltv) / (debt × 1e36)
 * Set HF = 1:
 *   liqPrice = debt × 1e36 / (collateral × lltv)
 *
 * Returned scale: 1e36 (matches Morpho's oracle).
 */
export function liquidationOraclePrice(collateral: bigint, debt: bigint, lltvWad: bigint): bigint {
  if (collateral === 0n || lltvWad === 0n) return 0n;
  return (debt * 10n ** 36n) / ((collateral * lltvWad) / WAD);
}

/**
 * Buffer to liquidation as bps: (currentNav − liqNav) / currentNav × 10000.
 * Returns 0 if currentNav <= liqNav (already at/under liq).
 */
export function bufferBps(currentOraclePrice: bigint, liqOraclePrice: bigint): number {
  if (currentOraclePrice <= liqOraclePrice) return 0;
  const num = currentOraclePrice - liqOraclePrice;
  return Number((num * 10_000n) / currentOraclePrice);
}

/**
 * Drift-to-liquidation: time `t` in years to HF = 1 assuming the current
 * primeApy and borrowApy hold constant.
 *
 *   HF(t) = HF(0) × exp((primeApy − borrowApy) × t)
 *   Solve HF(t) = 1:
 *     t = ln(HF) / (borrowApy − primeApy)
 *
 * Cases:
 *   - borrowApy ≤ primeApy → position drifts UP, never liquidates from rate
 *     drift alone. Return `{ stable: true }`.
 *   - HF ≤ 1 → already underwater. Return `{ underwater: true }`.
 *   - Otherwise return `{ years: t }`.
 */
export type DriftResult =
  | { stable: true }
  | { underwater: true }
  | { years: number };

export function driftToLiquidation(hfWad: bigint, primeApy: number, borrowApy: number): DriftResult {
  if (borrowApy <= primeApy) return { stable: true };
  const hf = Number(hfWad) / Number(WAD);
  if (hf <= 1) return { underwater: true };
  const years = Math.log(hf) / (borrowApy - primeApy);
  return { years };
}

export function formatDrift(d: DriftResult): string {
  if ('stable' in d) return 'HF stable at current rates.';
  if ('underwater' in d) return 'At liquidation now.';
  if (d.years > 5) return 'Drift not a near-term concern.';
  if (d.years < 1) {
    const months = Math.max(1, Math.round(d.years * 12));
    return `~${months} ${months === 1 ? 'month' : 'months'} to HF = 1 at current rates.`;
  }
  return `~${d.years.toFixed(1)} years to HF = 1 at current rates.`;
}

// Format the liquidation oracle price as a USDC-per-PRIME human number.
// Oracle scale is 1e36 because both tokens are 6dp; effective NAV ratio is
// price / 1e36 USDC per PRIME (assuming PYUSD≈USDC peg, which it is).
export function navFromOraclePrice(oraclePrice: bigint): number {
  return Number(oraclePrice) / 1e36;
}

void MARKET_PARAMS;
void RAY;
