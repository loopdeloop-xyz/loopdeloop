'use client';

import {
  type Address,
  type Hex,
  type WalletClient,
} from 'viem';
import { publicClient } from './viem';
import {
  ADDRS,
  MARKET_PARAMS,
  MARKET_ID,
  CLOSE_FEE_BPS,
  ADD_FEE_BPS,
  REPAY_FEE_BPS,
  ADJUST_FEE_BPS,
} from './addresses';
import { ERC20_ABI } from './abi';
import {
  buildEntryBundle,
  buildAddCollateralBundle,
  buildRepayBundle,
  buildAtomicCloseBundle,
  buildLeverUpBundle,
  buildLeverDownBundle,
  encodeMulticall,
} from './bundler';
import { signUsdcPermit, signMorphoAuth } from './sign';
import {
  applySlippage,
  inflateForSlippage,
  quoteCurvePyusdToUsdc,
  quoteCurveUsdcToPyusd,
  quoteUniV3PrimeToUsdc,
} from './quote';
import { planLeverage } from './loop';
import {
  readMarket,
  readOraclePrice,
  readPosition,
  computeBorrowAssets,
  readIsAuthorized,
} from './morpho';

const MAX_UINT = 2n ** 256n - 1n;

export interface ExecuteHandlers {
  onSigning?: () => void;
  onSending?: () => void;
  onSubmitted?: (hash: Hex) => void;
}

// ============================================================
// Local entry-basis storage (v2). Cumulative ledger of deposits so PnL
// math survives multi-open and partial-close sequences.
//
// Schema v2:
//   firstOpenTimestamp:        first time the user established a basis
//   lastUpdateTimestamp:       last mutation
//   cumulativeDepositUsdcRaw:  running sum of net USDC deposits, scaled
//                              down on partial close by remaining fraction.
//
// Key carries the schema version so v1 entries (single-deposit, the buggy
// shape) are naturally orphaned and PnL renders empty for those positions
// until the user does a new open or close that re-establishes basis.
// ============================================================

const ENTRY_BASIS_VERSION = 2;

export interface EntryBasis {
  firstOpenTimestamp: number;
  lastUpdateTimestamp: number;
  cumulativeDepositUsdcRaw: string;
}

function entryBasisKey(user: Address): string {
  return `loopdeloop:positions:v${ENTRY_BASIS_VERSION}:${user.toLowerCase()}:${MARKET_ID.toLowerCase()}`;
}

export function readEntryBasis(user: Address): EntryBasis | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(entryBasisKey(user));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<EntryBasis>;
    if (typeof parsed.firstOpenTimestamp !== 'number') return undefined;
    if (typeof parsed.cumulativeDepositUsdcRaw !== 'string') return undefined;
    return {
      firstOpenTimestamp: parsed.firstOpenTimestamp,
      lastUpdateTimestamp: parsed.lastUpdateTimestamp ?? parsed.firstOpenTimestamp,
      cumulativeDepositUsdcRaw: parsed.cumulativeDepositUsdcRaw,
    };
  } catch {
    return undefined;
  }
}

function writeEntryBasis(user: Address, entry: EntryBasis) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(entryBasisKey(user), JSON.stringify(entry));
  } catch {
    // localStorage may be blocked; the Since-open rows simply won't appear.
  }
}

// Add a fresh deposit (net of fee) to the cumulative basis. Creates the
// entry on first call.
function addDepositToBasis(user: Address, netDepositUsdcRaw: bigint) {
  if (typeof window === 'undefined') return;
  const now = Math.floor(Date.now() / 1000);
  const existing = readEntryBasis(user);
  const newCumulative = existing
    ? BigInt(existing.cumulativeDepositUsdcRaw) + netDepositUsdcRaw
    : netDepositUsdcRaw;
  writeEntryBasis(user, {
    firstOpenTimestamp: existing?.firstOpenTimestamp ?? now,
    lastUpdateTimestamp: now,
    cumulativeDepositUsdcRaw: newCumulative.toString(),
  });
}

// Scale the cumulative basis down by `remainingFraction` after a partial
// close. `remainingFraction` is 1.0 = no change, 0.5 = halve, 0 = clear.
export function scaleEntryBasis(user: Address, remainingFraction: number) {
  if (typeof window === 'undefined') return;
  const existing = readEntryBasis(user);
  if (!existing) return;
  if (remainingFraction <= 0) {
    clearEntryBasis(user);
    return;
  }
  if (remainingFraction >= 1) return;
  const num = BigInt(Math.round(remainingFraction * 1_000_000));
  const scaled = (BigInt(existing.cumulativeDepositUsdcRaw) * num) / 1_000_000n;
  writeEntryBasis(user, {
    ...existing,
    lastUpdateTimestamp: Math.floor(Date.now() / 1000),
    cumulativeDepositUsdcRaw: scaled.toString(),
  });
}

export function clearEntryBasis(user: Address) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(entryBasisKey(user));
  } catch {
    // ignore
  }
}

// ============================================================
// Open (v2)
// ============================================================

export interface OpenParams {
  user: Address;
  inputUsdc: bigint;
  targetLtvWad: bigint;
  slippageBps: number;
  deadlineSeconds?: number;
}

export async function executeLoop(
  wallet: WalletClient,
  p: OpenParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  if (p.inputUsdc <= 0n) throw new Error('amount must be > 0');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const [oraclePrice, balance] = await Promise.all([
    readOraclePrice(publicClient),
    publicClient.readContract({
      address: ADDRS.USDC as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [p.user],
    }),
  ]);
  if (balance < p.inputUsdc) throw new Error('USDC balance insufficient');

  const plan = planLeverage({
    initialUsdc: p.inputUsdc,
    targetLtvWad: p.targetLtvWad,
    oraclePrice,
    lltvWad: MARKET_PARAMS.lltv,
  });

  const expectedCurve = await quoteCurvePyusdToUsdc(publicClient, plan.flashAmountPyusd);
  const minCurve = applySlippage(expectedCurve, p.slippageBps);

  h.onSigning?.();

  const permit = await signUsdcPermit(
    wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, p.inputUsdc, deadline,
  );
  const auth = await signMorphoAuth(
    wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, true, deadline,
  );

  const bundle = buildEntryBundle({
    user: p.user,
    feeUsdc: plan.feeUsdc,
    netUsdc: plan.netUsdc,
    flashAmountPyusd: plan.flashAmountPyusd,
    minUsdcFromSwap: minCurve,
    permit: { value: p.inputUsdc, deadline, v: permit.v, r: permit.r, s: permit.s },
    morphoAuth: {
      authorizer: p.user,
      authorized: ADDRS.GENERAL_ADAPTER_1 as Address,
      isAuthorized: true,
      nonce: auth.nonce, deadline, v: auth.v, r: auth.r, s: auth.s,
    },
  });
  const data = encodeMulticall(bundle);

  await simulateOrThrow(p.user, data);

  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user, chain: null, to: ADDRS.BUNDLER3 as Address, data, value: 0n,
  });
  h.onSubmitted?.(hash);

  // Append this deposit to the running cumulative basis.
  addDepositToBasis(p.user, plan.netUsdc);

  return hash;
}

// ============================================================
// Add collateral (v3, no flashloan, no Morpho auth)
// ============================================================

export interface AddCollateralParams {
  user: Address;
  inputUsdc: bigint;
  slippageBps: number;  // unused for now (no swap), reserved for future routes
  deadlineSeconds?: number;
}

export async function executeAddCollateral(
  wallet: WalletClient,
  p: AddCollateralParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  if (p.inputUsdc <= 0n) throw new Error('amount must be > 0');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const balance = await publicClient.readContract({
    address: ADDRS.USDC as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [p.user],
  });
  if (balance < p.inputUsdc) throw new Error('USDC balance insufficient');

  const feeUsdc = (p.inputUsdc * ADD_FEE_BPS) / 10_000n;
  const netUsdc = p.inputUsdc - feeUsdc;

  h.onSigning?.();
  const permit = await signUsdcPermit(
    wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, p.inputUsdc, deadline,
  );

  const bundle = buildAddCollateralBundle({
    user: p.user,
    inputUsdc: p.inputUsdc,
    feeUsdc,
    netUsdc,
    permit: { value: p.inputUsdc, deadline, v: permit.v, r: permit.r, s: permit.s },
  });
  const data = encodeMulticall(bundle);

  await simulateOrThrow(p.user, data);

  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user, chain: null, to: ADDRS.BUNDLER3 as Address, data, value: 0n,
  });
  h.onSubmitted?.(hash);
  return hash;
}

// ============================================================
// Repay debt (v3, no flashloan, no Morpho auth)
// ============================================================

export interface RepayParams {
  user: Address;
  inputUsdc: bigint;        // total USDC the user is putting in
  slippageBps: number;      // applied to the Curve USDC → PYUSD leg
  deadlineSeconds?: number;
}

export async function executeRepay(
  wallet: WalletClient,
  p: RepayParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  if (p.inputUsdc <= 0n) throw new Error('amount must be > 0');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const [balance, market, pos] = await Promise.all([
    publicClient.readContract({
      address: ADDRS.USDC as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [p.user],
    }),
    readMarket(publicClient),
    readPosition(publicClient, p.user),
  ]);
  if (balance < p.inputUsdc) throw new Error('USDC balance insufficient');

  const outstandingDebt = computeBorrowAssets(pos.borrowShares, market);
  if (outstandingDebt === 0n) throw new Error('Position has no outstanding debt');

  const feeUsdc = (p.inputUsdc * REPAY_FEE_BPS) / 10_000n;
  const netUsdc = p.inputUsdc - feeUsdc;

  // Quote USDC → PYUSD via Curve at the net size.
  const expectedPyusd = await quoteCurveUsdcToPyusd(publicClient, netUsdc);
  const minPyusdOut = applySlippage(expectedPyusd, p.slippageBps);

  // Cap repay at the user's outstanding debt; the bundle reverts if you try
  // to repay more than the position owes.
  const repayAssets = expectedPyusd > outstandingDebt ? outstandingDebt : expectedPyusd;

  h.onSigning?.();
  const permit = await signUsdcPermit(
    wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, p.inputUsdc, deadline,
  );

  const bundle = buildRepayBundle({
    user: p.user,
    inputUsdc: p.inputUsdc,
    feeUsdc,
    netUsdc,
    minPyusdOut,
    repayAssets,
    permit: { value: p.inputUsdc, deadline, v: permit.v, r: permit.r, s: permit.s },
  });
  const data = encodeMulticall(bundle);

  await simulateOrThrow(p.user, data);

  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user, chain: null, to: ADDRS.BUNDLER3 as Address, data, value: 0n,
  });
  h.onSubmitted?.(hash);
  return hash;
}

// ============================================================
// Close (v3, atomic)
// ============================================================

export interface CloseParams {
  user: Address;
  fraction: number;       // 0 < fraction <= 1.0
  slippageBps: number;    // applied to UniV3 PRIME → USDC and Curve USDC → PYUSD
  deadlineSeconds?: number;
}

export async function executeClose(
  wallet: WalletClient,
  p: CloseParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  if (p.fraction <= 0 || p.fraction > 1) throw new Error('fraction must be in (0, 1]');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const [market, pos, isAuth] = await Promise.all([
    readMarket(publicClient),
    readPosition(publicClient, p.user),
    readIsAuthorized(publicClient, p.user, ADDRS.GENERAL_ADAPTER_1 as Address),
  ]);

  if (pos.collateral === 0n && pos.borrowShares === 0n) {
    throw new Error('No active position to close');
  }

  const debt = computeBorrowAssets(pos.borrowShares, market);
  const useMaxShares = p.fraction === 1;

  // Partial-close sizing. For full close we use useMaxShares=true and a
  // generous flash that includes a buffer for borrow accrual between quote
  // and inclusion.
  const fracNum = BigInt(Math.round(p.fraction * 1_000_000));
  const fracDen = 1_000_000n;

  const debtToRepayAssets = useMaxShares ? debt : (debt * fracNum) / fracDen;
  const collateralToWithdraw = useMaxShares
    ? pos.collateral
    : (pos.collateral * fracNum) / fracDen;

  // Safety buffer for accrual between quote and inclusion.
  const safetyBuffer = debtToRepayAssets / 10_000n > 1000n
    ? debtToRepayAssets / 10_000n
    : 1000n;
  const flashAmountPyusd = debtToRepayAssets + safetyBuffer;

  // Quote PRIME → USDC at exact close size.
  const uni = await quoteUniV3PrimeToUsdc(publicClient, collateralToWithdraw);
  if (uni.amountOut === 0n) throw new Error('Uniswap quote failed');
  const minUsdcFromPrime = applySlippage(uni.amountOut, p.slippageBps);

  // Quote USDC → PYUSD inversion: how much USDC do we need to push into
  // Curve to manufacture `flashAmountPyusd` PYUSD?
  // Curve PYUSD/USDC tracks ~1:1; use a get_dy probe at the flash size then
  // scale up by the deficit ratio, plus slippage padding.
  const dyAtFlash = await quoteCurveUsdcToPyusd(publicClient, flashAmountPyusd);
  if (dyAtFlash === 0n) throw new Error('Curve quote failed');
  const dxEstimate = (flashAmountPyusd * flashAmountPyusd) / dyAtFlash;
  const dxUsdcForFlashRepay = inflateForSlippage(dxEstimate, p.slippageBps);

  // Compute fee on expected proceeds.
  const expectedUserOutPreFee = minUsdcFromPrime > dxUsdcForFlashRepay
    ? minUsdcFromPrime - dxUsdcForFlashRepay
    : 0n;
  if (expectedUserOutPreFee === 0n) {
    throw new Error('Close would not yield positive USDC at current quote');
  }
  const feeUsdc = (expectedUserOutPreFee * CLOSE_FEE_BPS) / 10_000n;

  // Pre-compute the expected PYUSD residual on GA1 so the inner bundle can
  // sweep it to the user instead of stranding it. Components:
  //   (a) flashAmountPyusd - debtToRepayAssets ........ safety buffer left after repay
  //   (b) curveOutAt(dxUsdcForFlashRepay) - flashAmountPyusd  the Curve overshoot
  // We re-quote at the actual dx to get an accurate (b), then buffer the
  // sweep amount DOWN by 30 bps so a tiny adverse pool move between sign and
  // include doesn't cause the sweep to revert with insufficient balance.
  const expectedCurveOutAtDx = await quoteCurveUsdcToPyusd(publicClient, dxUsdcForFlashRepay);
  const expectedPyusdResidual =
    flashAmountPyusd - debtToRepayAssets
    + (expectedCurveOutAtDx > flashAmountPyusd ? expectedCurveOutAtDx - flashAmountPyusd : 0n);
  // 30 bps safety buffer against the residual shrinking on actual execution.
  const pyusdSweepAmount = (expectedPyusdResidual * 9970n) / 10_000n;

  h.onSigning?.();

  // Sign Morpho authorization only if the user hasn't already authorized GA1.
  // v2 openers are already authorized; this skips a wallet popup for them.
  let morphoAuth = undefined;
  if (!isAuth) {
    const auth = await signMorphoAuth(
      wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, true, deadline,
    );
    morphoAuth = {
      authorizer: p.user,
      authorized: ADDRS.GENERAL_ADAPTER_1 as Address,
      isAuthorized: true,
      nonce: auth.nonce,
      deadline,
      v: auth.v, r: auth.r, s: auth.s,
    };
  }

  const bundle = buildAtomicCloseBundle({
    user: p.user,
    useMaxShares,
    debtToRepayAssets,
    collateralToWithdraw,
    flashAmountPyusd,
    minUsdcFromPrime,
    dxUsdcForFlashRepay,
    feeUsdc,
    pyusdSweepAmount,
    morphoAuth,
  });
  const data = encodeMulticall(bundle);

  await simulateOrThrow(p.user, data);

  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user, chain: null, to: ADDRS.BUNDLER3 as Address, data, value: 0n,
  });
  h.onSubmitted?.(hash);

  // Adjust local entry basis to reflect the close. Full close clears the
  // basis entirely. Partial close scales it down by the remaining fraction
  // so PnL math stays correct on what's left.
  if (useMaxShares) clearEntryBasis(p.user);
  else scaleEntryBasis(p.user, 1 - p.fraction);

  return hash;
}

// ============================================================
// Adjust leverage (v3): lever up or lever down to a target LTV while
// preserving equity.
// ============================================================

export interface AdjustLeverageParams {
  user: Address;
  // Target LTV (1e18 scale). Must be < market LLTV.
  targetLtvWad: bigint;
  slippageBps: number;
  deadlineSeconds?: number;
}

export async function executeAdjustLeverage(
  wallet: WalletClient,
  p: AdjustLeverageParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const [market, pos, oraclePrice, isAuth] = await Promise.all([
    readMarket(publicClient),
    readPosition(publicClient, p.user),
    readOraclePrice(publicClient),
    readIsAuthorized(publicClient, p.user, ADDRS.GENERAL_ADAPTER_1 as Address),
  ]);

  if (pos.collateral === 0n) throw new Error('No active position to adjust');
  if (p.targetLtvWad <= 0n || p.targetLtvWad >= MARKET_PARAMS.lltv) {
    throw new Error('target LTV out of bounds');
  }

  const debt = computeBorrowAssets(pos.borrowShares, market);
  // PRIME→PYUSD oracle price is 1e36 scaled (6/6 decimals pair). Convert to
  // collateral value in PYUSD: collateral × oraclePrice / 1e36, retaining 6dp.
  const collateralValuePyusd = (pos.collateral * oraclePrice) / 10n ** 30n / 10n ** 6n;
  // current LTV in WAD:
  const currentLtvWad = (debt * 10n ** 18n) / collateralValuePyusd;

  // No-op guard: difference < 1% of WAD.
  const ltvDelta = p.targetLtvWad > currentLtvWad
    ? p.targetLtvWad - currentLtvWad
    : currentLtvWad - p.targetLtvWad;
  if (ltvDelta < 10n ** 16n) throw new Error('Target LTV is the same as current');

  // Equity in PYUSD: collateralValuePyusd - debt.
  const equity = collateralValuePyusd - debt;
  // Target debt at new leverage, equity preserved: D' = E × L' / (1 - L').
  const targetDebt = (equity * p.targetLtvWad) / (10n ** 18n - p.targetLtvWad);

  // Sign Morpho auth only if not already authorized.
  let morphoAuth = undefined;
  if (!isAuth) {
    const auth = await signMorphoAuth(
      wallet, p.user, ADDRS.GENERAL_ADAPTER_1 as Address, true, deadline,
    );
    morphoAuth = {
      authorizer: p.user, authorized: ADDRS.GENERAL_ADAPTER_1 as Address, isAuthorized: true,
      nonce: auth.nonce, deadline, v: auth.v, r: auth.r, s: auth.s,
    };
  }

  let bundle;
  if (p.targetLtvWad > currentLtvWad) {
    // LEVER UP: borrow more, mint more PRIME, supply.
    const deltaDebt = targetDebt - debt;
    const feePyusd = (deltaDebt * ADJUST_FEE_BPS) / 10_000n;
    const expectedUsdc = await quoteCurvePyusdToUsdc(publicClient, deltaDebt);
    const minUsdcFromCurve = applySlippage(expectedUsdc, p.slippageBps);
    h.onSigning?.();
    bundle = buildLeverUpBundle({
      user: p.user, deltaDebt, feePyusd, minUsdcFromCurve, morphoAuth,
    });
  } else {
    // LEVER DOWN: repay debt, withdraw collateral, sell PRIME, buy back PYUSD.
    const deltaDebt = debt - targetDebt;
    // ΔCollateral in PRIME: equity × (L - L') / oraclePrice  ==  ΔDebt / oraclePrice (PYUSD value matches).
    // We must oversize the PRIME we sell so the Uniswap → Curve round-trip
    // covers both legs of slippage AND the Curve buyback's inflated dx. The
    // equity-preserving amount alone would leave the inner bundle ~2 ×
    // slippageBps short of USDC for the flash repay. Surplus USDC after the
    // buyback is swept to user (the bundle ends with a MAX_UINT USDC sweep).
    const baseDeltaCollateral = (deltaDebt * 10n ** 36n) / oraclePrice;
    const deltaCollateral = inflateForSlippage(baseDeltaCollateral, p.slippageBps * 3);
    const safetyBuffer = deltaDebt / 10_000n > 1000n ? deltaDebt / 10_000n : 1000n;
    const flashAmountPyusd = deltaDebt + safetyBuffer;
    const uni = await quoteUniV3PrimeToUsdc(publicClient, deltaCollateral);
    if (uni.amountOut === 0n) throw new Error('Uniswap quote failed');
    const minUsdcFromPrime = applySlippage(uni.amountOut, p.slippageBps);
    const dyAtFlash = await quoteCurveUsdcToPyusd(publicClient, flashAmountPyusd);
    if (dyAtFlash === 0n) throw new Error('Curve quote failed');
    const dxEstimate = (flashAmountPyusd * flashAmountPyusd) / dyAtFlash;
    const dxUsdcForFlashRepay = inflateForSlippage(dxEstimate, p.slippageBps);
    const feeUsdc = (deltaDebt * ADJUST_FEE_BPS) / 10_000n;
    // Same PYUSD-residual sweep logic as executeClose.
    const expectedCurveOutAtDx = await quoteCurveUsdcToPyusd(publicClient, dxUsdcForFlashRepay);
    const expectedPyusdResidual =
      flashAmountPyusd - deltaDebt
      + (expectedCurveOutAtDx > flashAmountPyusd ? expectedCurveOutAtDx - flashAmountPyusd : 0n);
    const pyusdSweepAmount = (expectedPyusdResidual * 9970n) / 10_000n;
    h.onSigning?.();
    bundle = buildLeverDownBundle({
      user: p.user, deltaDebt, deltaCollateral, flashAmountPyusd,
      minUsdcFromPrime, dxUsdcForFlashRepay, feeUsdc, pyusdSweepAmount, morphoAuth,
    });
  }

  const data = encodeMulticall(bundle);
  await simulateOrThrow(p.user, data);
  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user, chain: null, to: ADDRS.BUNDLER3 as Address, data, value: 0n,
  });
  h.onSubmitted?.(hash);
  return hash;
}

// ============================================================
// Helpers
// ============================================================

// Map the most common custom-error selectors users will hit to plain English.
// viem already surfaces Solidity `revert("string")` cleanly; this fills the
// gap for selector-only reverts that look like `custom error 0xXXXXXXXX`.
const REVERT_SELECTORS: Record<string, string> = {
  '0x8199f5f3': 'Slippage exceeded — try again with a wider slippage tolerance or smaller size',
  '0x9d0eeeef': 'Curve slippage — pool moved against the quote',
  '0xe450d38c': 'Token transfer amount exceeds balance',
  '0x13be252b': 'Insufficient allowance for transferFrom',
  '0x82b42900': 'Unauthorized — Morpho authorization missing or expired',
  '0xf0732dd7': 'Inconsistent input on Morpho call',
  '0x4a1844cf': 'Permit deadline has expired',
  '0x756688fe': 'Invalid signature (permit or Morpho auth)',
};

function decodeRevertReason(msg: string): string {
  const m = msg.match(/0x[0-9a-fA-F]{8}/);
  if (m) {
    const sel = m[0].toLowerCase();
    if (REVERT_SELECTORS[sel]) return `${REVERT_SELECTORS[sel]} (${sel})`;
  }
  // Strip viem's "Raw Call Arguments:" appendix to keep the message terse.
  const reasonMatch = msg.match(/(?:reverted with reason:|Details:)\s*([^\n]+)/);
  if (reasonMatch) return reasonMatch[1].trim().slice(0, 200);
  return msg.slice(0, 200);
}

async function simulateOrThrow(user: Address, data: Hex) {
  try {
    await publicClient.call({
      account: user,
      to: ADDRS.BUNDLER3 as Address,
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`simulation reverted: ${decodeRevertReason(msg)}`);
  }
}

// Verify that GA1, Bundler3, and the user have no leftover token balances post-tx.
// Returns the list of (label, balance) pairs for any non-zero leftovers, ideally empty.
export async function checkLeftovers(): Promise<{ label: string; balance: bigint }[]> {
  void MAX_UINT;
  const tokens: { label: string; addr: Address }[] = [
    { label: 'GA1 USDC', addr: ADDRS.USDC as Address },
    { label: 'GA1 PYUSD', addr: ADDRS.PYUSD as Address },
    { label: 'GA1 PRIME', addr: ADDRS.PRIME as Address },
    { label: 'GA1 wYLDS', addr: ADDRS.wYLDS as Address },
  ];
  const out: { label: string; balance: bigint }[] = [];
  for (const t of tokens) {
    const bal = await publicClient.readContract({
      address: t.addr,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [ADDRS.GENERAL_ADAPTER_1 as Address],
    });
    if (bal > 0n) out.push({ label: t.label, balance: bal });
  }
  return out;
}
