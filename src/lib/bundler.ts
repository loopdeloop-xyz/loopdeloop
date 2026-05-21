import {
  type Address,
  type Hex,
  encodeFunctionData,
  keccak256,
} from 'viem';
import {
  ADDRS,
  CURVE_IDX,
  FEE_RECIPIENT,
  MARKET_PARAMS,
} from './addresses';
import {
  BUNDLER3_ABI,
  CURVE_POOL_ABI,
  ERC20_ABI,
  GA1_ABI,
  MORPHO_ABI,
  UNI_V3_ROUTER_ABI,
} from './abi';
import { UNI_V3_PRIME_USDC_FEE } from './addresses';

export interface Call {
  to: Address;
  data: Hex;
  value: bigint;
  skipRevert: boolean;
  callbackHash: Hex;
}

const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex;
const MAX_UINT = 2n ** 256n - 1n;
const MAX_SHARE_PRICE_E27 = MAX_UINT;

export function callPermit(
  token: Address,
  owner: Address,
  spender: Address,
  value: bigint,
  deadline: bigint,
  v: number,
  r: Hex,
  s: Hex,
): Call {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'permit',
      args: [owner, spender, value, deadline, v, r, s],
    }),
    value: 0n,
    skipRevert: true,
    callbackHash: ZERO_HASH,
  };
}

export interface AuthSig {
  authorizer: Address;
  authorized: Address;
  isAuthorized: boolean;
  nonce: bigint;
  deadline: bigint;
  v: number;
  r: Hex;
  s: Hex;
}

export function callMorphoAuthWithSig(a: AuthSig): Call {
  return {
    to: ADDRS.MORPHO as Address,
    data: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: 'setAuthorizationWithSig',
      args: [
        {
          authorizer: a.authorizer,
          authorized: a.authorized,
          isAuthorized: a.isAuthorized,
          nonce: a.nonce,
          deadline: a.deadline,
        },
        { v: a.v, r: a.r, s: a.s },
      ],
    }),
    value: 0n,
    skipRevert: true,
    callbackHash: ZERO_HASH,
  };
}

export function callGa1TransferFrom(token: Address, receiver: Address, amount: bigint): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'erc20TransferFrom',
      args: [token, receiver, amount],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

export function callGa1Sweep(token: Address, receiver: Address, amount: bigint): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'erc20Transfer',
      args: [token, receiver, amount],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

export function callGa1Erc4626Deposit(vault: Address, assets: bigint, receiver: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'erc4626Deposit',
      args: [vault, assets, MAX_SHARE_PRICE_E27, receiver],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

export function callGa1MorphoSupplyCollateral(assets: bigint, onBehalf: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoSupplyCollateral',
      args: [MARKET_PARAMS, assets, onBehalf, '0x'],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

export function callGa1MorphoBorrow(assets: bigint, receiver: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoBorrow',
      args: [MARKET_PARAMS, assets, 0n, 0n, receiver],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Repay all of `onBehalf`'s outstanding borrow (shares = MAX). GA1 reads live
// borrowShares at execution time, so this clears the exact debt at-block.
// maxSharePriceE27 = MAX_UINT to skip the share-price slippage check; we rely
// on the bundle's other slippage floors (Curve min_dy, Uniswap minOut) for
// economic protection.
export function callGa1MorphoRepayAll(onBehalf: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoRepay',
      args: [MARKET_PARAMS, 0n, MAX_UINT, MAX_SHARE_PRICE_E27, onBehalf, '0x'],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Repay `assets` PYUSD of `onBehalf`'s debt. For partial close.
export function callGa1MorphoRepayAssets(assets: bigint, onBehalf: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoRepay',
      args: [MARKET_PARAMS, assets, 0n, MAX_SHARE_PRICE_E27, onBehalf, '0x'],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Withdraw MAX collateral (the full position).
export function callGa1MorphoWithdrawCollateral(receiver: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoWithdrawCollateral',
      args: [MARKET_PARAMS, MAX_UINT, receiver],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Withdraw an explicit `assets` amount of collateral. For partial close.
export function callGa1MorphoWithdrawCollateralAssets(assets: bigint, receiver: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoWithdrawCollateral',
      args: [MARKET_PARAMS, assets, receiver],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Direct call to a token contract's `approve(spender, amount)`. When this Call
// runs inside Bundler3.multicall (top level or reenter), msg.sender == Bundler3,
// so Bundler3 grants the allowance.
export function callTokenApprove(token: Address, spender: Address, amount: bigint): Call {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Direct call to Uniswap V3 SwapRouter02 `exactInputSingle`. Caller (Bundler3
// during multicall) must hold `amountIn` of `tokenIn` and have approved the
// router for at least `amountIn` of that token. `recipient` receives `tokenOut`.
export function callUniV3SwapExactIn(
  tokenIn: Address,
  tokenOut: Address,
  fee: number,
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address,
): Call {
  return {
    to: ADDRS.UNI_V3_SWAP_ROUTER_02 as Address,
    data: encodeFunctionData({
      abi: UNI_V3_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [{
        tokenIn,
        tokenOut,
        fee,
        recipient,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      }],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// PRIME → USDC swap on the 0.01% pool, recipient configurable.
export function callUniV3SwapPrimeToUsdc(amountIn: bigint, minOut: bigint, recipient: Address): Call {
  return callUniV3SwapExactIn(
    ADDRS.PRIME as Address,
    ADDRS.USDC as Address,
    UNI_V3_PRIME_USDC_FEE,
    amountIn,
    minOut,
    recipient,
  );
}

export function callCurveExchangeReceived(
  i: number,
  j: number,
  dx: bigint,
  minDy: bigint,
  receiver: Address,
): Call {
  return {
    to: ADDRS.CURVE_PYUSD_USDC as Address,
    data: encodeFunctionData({
      abi: CURVE_POOL_ABI,
      functionName: 'exchange_received',
      args: [BigInt(i), BigInt(j), dx, minDy, receiver],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

// Encode the GA1.morphoFlashLoan call with a precomputed reenter callback hash.
// Bundler3 verifies during the flash callback that
//   keccak256(bytes.concat(bytes20(msg.sender), keccak256(msg.data[4:]))) == reenterHash
// and we set callbackHash = keccak256(reenter args payload) so it matches.
export function callMorphoFlashLoan(token: Address, assets: bigint, innerBundle: Call[]): Call {
  const reenterCalldata = encodeFunctionData({
    abi: BUNDLER3_ABI,
    functionName: 'reenter',
    args: [innerBundle],
  });
  const innerArgs = ('0x' + reenterCalldata.slice(10)) as Hex;
  const callbackHash = keccak256(innerArgs);
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoFlashLoan',
      args: [token, assets, innerArgs],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash,
  };
}

export interface FlashEntryBundleParams {
  user: Address;
  feeUsdc: bigint;
  netUsdc: bigint;
  flashAmountPyusd: bigint;
  minUsdcFromSwap: bigint;
  permit?: { value: bigint; deadline: bigint; v: number; r: Hex; s: Hex };
  morphoAuth?: AuthSig;
}

// Single-tx leveraged entry bundle.
// Outer: optional permit + optional morpho auth-with-sig + fee skim + transfer to GA1 + flashloan.
// Inner (callback): curve PYUSD→USDC + ERC4626 deposit twice + supplyCollateral + borrow.
export function buildEntryBundle(p: FlashEntryBundleParams): Call[] {
  const inner: Call[] = [
    callGa1Sweep(ADDRS.PYUSD as Address, ADDRS.CURVE_PYUSD_USDC as Address, p.flashAmountPyusd),
    callCurveExchangeReceived(
      CURVE_IDX.PYUSD,
      CURVE_IDX.USDC,
      p.flashAmountPyusd,
      p.minUsdcFromSwap,
      ADDRS.GENERAL_ADAPTER_1 as Address,
    ),
    callGa1Erc4626Deposit(ADDRS.wYLDS as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    callGa1Erc4626Deposit(ADDRS.PRIME as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    callGa1MorphoSupplyCollateral(MAX_UINT, p.user),
    callGa1MorphoBorrow(p.flashAmountPyusd, ADDRS.GENERAL_ADAPTER_1 as Address),
  ];

  const outer: Call[] = [];
  if (p.permit) {
    outer.push(
      callPermit(
        ADDRS.USDC as Address,
        p.user,
        ADDRS.GENERAL_ADAPTER_1 as Address,
        p.permit.value,
        p.permit.deadline,
        p.permit.v,
        p.permit.r,
        p.permit.s,
      ),
    );
  }
  if (p.morphoAuth) {
    outer.push(callMorphoAuthWithSig(p.morphoAuth));
  }
  outer.push(
    callGa1TransferFrom(ADDRS.USDC as Address, FEE_RECIPIENT, p.feeUsdc),
    callGa1TransferFrom(ADDRS.USDC as Address, ADDRS.GENERAL_ADAPTER_1 as Address, p.netUsdc),
    callMorphoFlashLoan(ADDRS.PYUSD as Address, p.flashAmountPyusd, inner),
  );
  return outer;
}

// ============================================================
// v3 builders: add collateral, repay debt, atomic close
// ============================================================

export interface AddCollateralBundleParams {
  user: Address;
  inputUsdc: bigint;          // total USDC the user is depositing (includes fee)
  feeUsdc: bigint;            // 0.25% of inputUsdc, sent to FEE_RECIPIENT
  netUsdc: bigint;            // inputUsdc - feeUsdc, used to mint PRIME
  permit: { value: bigint; deadline: bigint; v: number; r: Hex; s: Hex };
}

// Deposit additional USDC, mint PRIME at NAV, supply as collateral. No flash
// loan, no Morpho authorization (supplyCollateral does not check it).
export function buildAddCollateralBundle(p: AddCollateralBundleParams): Call[] {
  return [
    callPermit(
      ADDRS.USDC as Address,
      p.user,
      ADDRS.GENERAL_ADAPTER_1 as Address,
      p.permit.value,
      p.permit.deadline,
      p.permit.v,
      p.permit.r,
      p.permit.s,
    ),
    callGa1TransferFrom(ADDRS.USDC as Address, FEE_RECIPIENT, p.feeUsdc),
    callGa1TransferFrom(ADDRS.USDC as Address, ADDRS.GENERAL_ADAPTER_1 as Address, p.netUsdc),
    callGa1Erc4626Deposit(ADDRS.wYLDS as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    callGa1Erc4626Deposit(ADDRS.PRIME as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    callGa1MorphoSupplyCollateral(MAX_UINT, p.user),
  ];
}

export interface RepayBundleParams {
  user: Address;
  inputUsdc: bigint;          // total USDC the user is sending (includes fee)
  feeUsdc: bigint;            // 0.25% of inputUsdc, sent to FEE_RECIPIENT
  netUsdc: bigint;            // inputUsdc - feeUsdc, swapped to PYUSD
  minPyusdOut: bigint;        // floor on Curve USDC → PYUSD output (slippage-protected)
  repayAssets: bigint;        // exact PYUSD amount to repay (capped at user's debt at quote time)
  permit: { value: bigint; deadline: bigint; v: number; r: Hex; s: Hex };
}

// Swap USDC → PYUSD via Curve and repay borrow on user's behalf. No flash
// loan, no Morpho authorization (repay does not check it).
export function buildRepayBundle(p: RepayBundleParams): Call[] {
  return [
    callPermit(
      ADDRS.USDC as Address,
      p.user,
      ADDRS.GENERAL_ADAPTER_1 as Address,
      p.permit.value,
      p.permit.deadline,
      p.permit.v,
      p.permit.r,
      p.permit.s,
    ),
    callGa1TransferFrom(ADDRS.USDC as Address, FEE_RECIPIENT, p.feeUsdc),
    callGa1TransferFrom(ADDRS.USDC as Address, ADDRS.GENERAL_ADAPTER_1 as Address, p.netUsdc),
    // Push the net USDC into the Curve pool, then call exchange_received.
    callGa1Sweep(ADDRS.USDC as Address, ADDRS.CURVE_PYUSD_USDC as Address, p.netUsdc),
    callCurveExchangeReceived(
      CURVE_IDX.USDC,
      CURVE_IDX.PYUSD,
      p.netUsdc,
      p.minPyusdOut,
      ADDRS.GENERAL_ADAPTER_1 as Address,
    ),
    // Repay the user's borrow by exact PYUSD amount.
    callGa1MorphoRepayAssets(p.repayAssets, p.user),
  ];
}

export interface AtomicCloseBundleParams {
  user: Address;
  // Full close uses `useMaxShares = true`; partial uses `debtToRepayAssets`.
  useMaxShares: boolean;
  debtToRepayAssets: bigint;
  // PRIME amount to withdraw + sell. For partial close, this is collateral * fraction.
  collateralToWithdraw: bigint;
  // PYUSD amount to flash-borrow (debtToRepay + safetyBuffer for accrual).
  flashAmountPyusd: bigint;
  // Slippage floor for the PRIME → USDC sell on UniV3.
  minUsdcFromPrime: bigint;
  // USDC to push into Curve to manufacture flashAmount PYUSD on the buyback.
  dxUsdcForFlashRepay: bigint;
  // Fee to skim from the user's USDC output. Computed at quote time as
  // CLOSE_FEE_BPS of expected net-out (kept fixed to keep the bundle simple).
  // The user is swept MAX_UINT after the fee skim, so any positive variance
  // from the quote flows to the user. Slippage protection is upstream: the
  // UniV3 sale enforces `minUsdcFromPrime`.
  feeUsdc: bigint;
  // PYUSD residual to sweep to user just before the flash auto-repays. The
  // Curve buyback typically produces slightly more PYUSD than the flash needs
  // (because `dxUsdcForFlashRepay` is sized with safety padding); without this
  // sweep that excess strands on GA1. Caller computes conservatively at quote
  // time so the sweep never exceeds the actual balance.
  pyusdSweepAmount: bigint;
  morphoAuth?: AuthSig;
}

// Atomic close: full or partial via fraction at the caller level. The bundle
// flash-borrows PYUSD to repay the borrow, withdraws collateral, sells PRIME on
// Uniswap V3 for USDC, buys back PYUSD on Curve to repay the flash, then sweeps
// the fee and the remaining USDC to the user.
export function buildAtomicCloseBundle(p: AtomicCloseBundleParams): Call[] {
  const repayCall = p.useMaxShares
    ? callGa1MorphoRepayAll(p.user)
    : callGa1MorphoRepayAssets(p.debtToRepayAssets, p.user);

  const inner: Call[] = [
    // 1. Repay debt with the flash-borrowed PYUSD.
    repayCall,
    // 2. Withdraw collateral (full or partial) to GA1.
    p.useMaxShares
      ? callGa1MorphoWithdrawCollateral(ADDRS.GENERAL_ADAPTER_1 as Address)
      : callGa1MorphoWithdrawCollateralAssets(p.collateralToWithdraw, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 3. Stage the withdrawn PRIME on Bundler3 so the UniV3 router can pull
    //    via transferFrom(msg.sender=Bundler3, ...).
    callGa1Sweep(ADDRS.PRIME as Address, ADDRS.BUNDLER3 as Address, p.collateralToWithdraw),
    // 4. Approve the UniV3 router to pull that PRIME from Bundler3.
    callTokenApprove(ADDRS.PRIME as Address, ADDRS.UNI_V3_SWAP_ROUTER_02 as Address, p.collateralToWithdraw),
    // 5. Sell PRIME → USDC on Uniswap V3 (0.01% pool). Recipient = GA1.
    callUniV3SwapPrimeToUsdc(p.collateralToWithdraw, p.minUsdcFromPrime, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 6. Push enough USDC into Curve to manufacture the PYUSD needed to repay
    //    the flash loan.
    callGa1Sweep(ADDRS.USDC as Address, ADDRS.CURVE_PYUSD_USDC as Address, p.dxUsdcForFlashRepay),
    callCurveExchangeReceived(
      CURVE_IDX.USDC,
      CURVE_IDX.PYUSD,
      p.dxUsdcForFlashRepay,
      p.flashAmountPyusd,
      ADDRS.GENERAL_ADAPTER_1 as Address,
    ),
    // 7. Skim fixed fee from USDC, then sweep all remaining USDC to user.
    callGa1Sweep(ADDRS.USDC as Address, FEE_RECIPIENT, p.feeUsdc),
    callGa1Sweep(ADDRS.USDC as Address, p.user, MAX_UINT),
    // 8. Sweep the PYUSD residual (Curve overshoot + accrual safety buffer) to
    //    user. Must be a fixed amount, not MAX_UINT, so the flash auto-repay
    //    still has `flashAmountPyusd` to pull from GA1's PYUSD balance.
    ...(p.pyusdSweepAmount > 0n
      ? [callGa1Sweep(ADDRS.PYUSD as Address, p.user, p.pyusdSweepAmount)]
      : []),
    // 9. Flash loan auto-repays from GA1's remaining PYUSD balance.
  ];

  const outer: Call[] = [];
  if (p.morphoAuth) {
    outer.push(callMorphoAuthWithSig(p.morphoAuth));
  }
  outer.push(callMorphoFlashLoan(ADDRS.PYUSD as Address, p.flashAmountPyusd, inner));
  return outer;
}

// ============================================================
// Lever up: borrow more PYUSD, mint more PRIME, supply, borrow again to
// repay the flash. User contributes no new USDC; the new debt funds the
// new collateral. Fee is paid in PYUSD by borrowing extra and sending
// directly to FEE_RECIPIENT.
// ============================================================

export interface LeverUpBundleParams {
  user: Address;
  // PYUSD to flash (delta debt the user wants to take on, equity preserved).
  deltaDebt: bigint;
  // Slippage floor on Curve PYUSD → USDC swap.
  minUsdcFromCurve: bigint;
  // Fee in PYUSD (0.25% of deltaDebt). Borrowed alongside deltaDebt and
  // forwarded to FEE_RECIPIENT.
  feePyusd: bigint;
  // Optional Morpho auth (required if user hasn't already authorized GA1).
  morphoAuth?: AuthSig;
}

export function buildLeverUpBundle(p: LeverUpBundleParams): Call[] {
  const totalFlash = p.deltaDebt;
  const inner: Call[] = [
    // 1. Push flashed PYUSD into Curve, swap to USDC.
    callGa1Sweep(ADDRS.PYUSD as Address, ADDRS.CURVE_PYUSD_USDC as Address, p.deltaDebt),
    callCurveExchangeReceived(
      CURVE_IDX.PYUSD, CURVE_IDX.USDC, p.deltaDebt, p.minUsdcFromCurve,
      ADDRS.GENERAL_ADAPTER_1 as Address,
    ),
    // 2. Mint wYLDS → PRIME from all USDC on GA1.
    callGa1Erc4626Deposit(ADDRS.wYLDS as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    callGa1Erc4626Deposit(ADDRS.PRIME as Address, MAX_UINT, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 3. Supply all PRIME as collateral on behalf of user.
    callGa1MorphoSupplyCollateral(MAX_UINT, p.user),
    // 4. Borrow deltaDebt + feePyusd PYUSD on behalf. Receiver = GA1.
    callGa1MorphoBorrow(p.deltaDebt + p.feePyusd, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 5. Pay the fee in PYUSD to FEE_RECIPIENT (deltaDebt remains on GA1 to repay the flash).
    callGa1Sweep(ADDRS.PYUSD as Address, FEE_RECIPIENT, p.feePyusd),
    // 6. Flash auto-repays from GA1's PYUSD balance (= deltaDebt).
  ];

  const outer: Call[] = [];
  if (p.morphoAuth) outer.push(callMorphoAuthWithSig(p.morphoAuth));
  outer.push(callMorphoFlashLoan(ADDRS.PYUSD as Address, totalFlash, inner));
  return outer;
}

// ============================================================
// Lever down: withdraw less collateral, repay less debt, equity preserved.
// Sells the withdrawn PRIME on Uniswap, uses USDC to buy PYUSD on Curve and
// repay the flash. Fee is skimmed in USDC after the flash buyback.
// ============================================================

export interface LeverDownBundleParams {
  user: Address;
  deltaDebt: bigint;             // PYUSD debt to repay
  deltaCollateral: bigint;       // PRIME to withdraw + sell
  flashAmountPyusd: bigint;      // = deltaDebt + safetyBuffer
  minUsdcFromPrime: bigint;      // floor on Uniswap PRIME → USDC sale
  dxUsdcForFlashRepay: bigint;   // USDC pushed into Curve to manufacture flashAmountPyusd PYUSD
  feeUsdc: bigint;               // skim after the flash; fixed at quote-time
  // PYUSD residual to sweep to user just before the flash auto-repays. Same
  // semantics as AtomicCloseBundleParams.pyusdSweepAmount.
  pyusdSweepAmount: bigint;
  morphoAuth?: AuthSig;
}

export function buildLeverDownBundle(p: LeverDownBundleParams): Call[] {
  const inner: Call[] = [
    // 1. Repay deltaDebt using flash-borrowed PYUSD.
    callGa1MorphoRepayAssets(p.deltaDebt, p.user),
    // 2. Withdraw deltaCollateral PRIME to GA1.
    callGa1MorphoWithdrawCollateralAssets(p.deltaCollateral, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 3. Stage PRIME on Bundler3 so the UniV3 router can transferFrom.
    callGa1Sweep(ADDRS.PRIME as Address, ADDRS.BUNDLER3 as Address, p.deltaCollateral),
    callTokenApprove(ADDRS.PRIME as Address, ADDRS.UNI_V3_SWAP_ROUTER_02 as Address, p.deltaCollateral),
    // 4. Sell PRIME → USDC on Uniswap V3, recipient GA1.
    callUniV3SwapPrimeToUsdc(p.deltaCollateral, p.minUsdcFromPrime, ADDRS.GENERAL_ADAPTER_1 as Address),
    // 5. Push USDC into Curve and buy back enough PYUSD to repay the flash.
    callGa1Sweep(ADDRS.USDC as Address, ADDRS.CURVE_PYUSD_USDC as Address, p.dxUsdcForFlashRepay),
    callCurveExchangeReceived(
      CURVE_IDX.USDC, CURVE_IDX.PYUSD, p.dxUsdcForFlashRepay, p.flashAmountPyusd,
      ADDRS.GENERAL_ADAPTER_1 as Address,
    ),
    // 6. Skim fee in USDC. Any further residual USDC (slippage tail) is swept to user.
    callGa1Sweep(ADDRS.USDC as Address, FEE_RECIPIENT, p.feeUsdc),
    callGa1Sweep(ADDRS.USDC as Address, p.user, MAX_UINT),
    // 7. Sweep PYUSD residual to user (Curve overshoot + accrual buffer).
    ...(p.pyusdSweepAmount > 0n
      ? [callGa1Sweep(ADDRS.PYUSD as Address, p.user, p.pyusdSweepAmount)]
      : []),
    // 8. Flash repays from GA1's remaining PYUSD balance.
  ];

  const outer: Call[] = [];
  if (p.morphoAuth) outer.push(callMorphoAuthWithSig(p.morphoAuth));
  outer.push(callMorphoFlashLoan(ADDRS.PYUSD as Address, p.flashAmountPyusd, inner));
  return outer;
}

export function encodeMulticall(bundle: Call[]): Hex {
  return encodeFunctionData({
    abi: BUNDLER3_ABI,
    functionName: 'multicall',
    args: [bundle],
  });
}
