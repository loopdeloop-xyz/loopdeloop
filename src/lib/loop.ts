import { FEE_BPS } from './addresses';

const WAD = 10n ** 18n;
const RAY = 10n ** 27n;

export interface LeverageInputs {
  initialUsdc: bigint;
  targetLtvWad: bigint;
  oraclePrice: bigint;
  lltvWad: bigint;
}

export interface LeveragePlan {
  feeUsdc: bigint;
  netUsdc: bigint;
  totalCollateralPyusd: bigint;
  finalCollateralPrime: bigint;
  flashAmountPyusd: bigint;
  expectedUsdcFromSwap: bigint;
  totalUsdcToDeposit: bigint;
  effectiveLtvWad: bigint;
  leverageRatio: number;
}

// Plan a leveraged entry. End-state target LTV = targetLtvWad.
// collateral_value (PYUSD) = netUSDC / (1 - L)
// debt = L * collateral_value
// PRIME = collateral_value / oraclePrice (price scaled by 1e36).
export function planLeverage(i: LeverageInputs): LeveragePlan {
  if (i.targetLtvWad > i.lltvWad) {
    throw new Error(`target LTV ${i.targetLtvWad} exceeds LLTV ${i.lltvWad}`);
  }

  const fee = (i.initialUsdc * FEE_BPS) / 10_000n;
  const net = i.initialUsdc - fee;
  const denom = WAD - i.targetLtvWad;
  if (denom <= 0n) throw new Error('invalid target LTV');

  const collateralValue = (net * WAD) / denom;
  const debt = (i.targetLtvWad * collateralValue) / WAD;
  // oraclePrice is scaled so PRIME (6dp) * price / 1e36 = PYUSD (6dp).
  // To go the other way: collateralValue (6dp PYUSD) * 1e36 / oraclePrice = PRIME (6dp).
  const primeAmount = (collateralValue * 10n ** 36n) / i.oraclePrice;

  return {
    feeUsdc: fee,
    netUsdc: net,
    totalCollateralPyusd: collateralValue,
    finalCollateralPrime: primeAmount,
    flashAmountPyusd: debt,
    expectedUsdcFromSwap: debt,
    totalUsdcToDeposit: net + debt,
    effectiveLtvWad: i.targetLtvWad,
    leverageRatio: Number(collateralValue) / Number(net),
  };
}

// Net APY = primeApy * L - borrowApy * (L - 1).
// L = collateral / equity = 1 / (1 - LTV).
export function netApy(primeApy: number, borrowApy: number, ltvWad: bigint): number {
  const ltv = Number(ltvWad) / Number(WAD);
  const L = 1 / (1 - ltv);
  return primeApy * L - borrowApy * (L - 1);
}

export function leverageRatioFromLtv(ltvWad: bigint): number {
  const ltv = Number(ltvWad) / Number(WAD);
  return 1 / (1 - ltv);
}

export function ltvFromLeverage(ratio: number): bigint {
  const ltvFloat = (ratio - 1) / ratio;
  return BigInt(Math.round(ltvFloat * 1e18));
}

export interface EntryCostBreakdown {
  serviceFeeBps: number;
  swapSlippageBps: number;
  flashloanFeeBps: number;
  totalBps: number;
}

export function entryCostBps(swapSlippageBps = 5): EntryCostBreakdown {
  const serviceFeeBps = Number(FEE_BPS);
  const flashloanFeeBps = 0;
  return {
    serviceFeeBps,
    swapSlippageBps,
    flashloanFeeBps,
    totalBps: serviceFeeBps + swapSlippageBps + flashloanFeeBps,
  };
}

export { WAD, RAY };
