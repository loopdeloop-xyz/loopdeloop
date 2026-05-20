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
} from './abi';

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

export function callGa1MorphoRepayAll(onBehalf: Address): Call {
  return {
    to: ADDRS.GENERAL_ADAPTER_1 as Address,
    data: encodeFunctionData({
      abi: GA1_ABI,
      functionName: 'morphoRepay',
      args: [MARKET_PARAMS, 0n, MAX_UINT, 0n, onBehalf, '0x'],
    }),
    value: 0n,
    skipRevert: false,
    callbackHash: ZERO_HASH,
  };
}

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

export function encodeMulticall(bundle: Call[]): Hex {
  return encodeFunctionData({
    abi: BUNDLER3_ABI,
    functionName: 'multicall',
    args: [bundle],
  });
}
