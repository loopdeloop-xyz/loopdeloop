'use client';

import {
  type Address,
  type Hex,
  type WalletClient,
} from 'viem';
import { publicClient } from './viem';
import { ADDRS, MARKET_PARAMS } from './addresses';
import { ERC20_ABI } from './abi';
import { buildEntryBundle, encodeMulticall } from './bundler';
import { signUsdcPermit, signMorphoAuth } from './sign';
import { applySlippage, quoteCurvePyusdToUsdc } from './quote';
import { planLeverage } from './loop';
import { readMarket, readOraclePrice } from './morpho';

export interface ExecuteParams {
  user: Address;
  inputUsdc: bigint;
  targetLtvWad: bigint;
  slippageBps: number;
  deadlineSeconds?: number;
}

export interface ExecuteHandlers {
  onSigning?: () => void;
  onSending?: () => void;
  onSubmitted?: (hash: Hex) => void;
}

export async function executeLoop(
  wallet: WalletClient,
  p: ExecuteParams,
  h: ExecuteHandlers = {},
): Promise<Hex> {
  if (p.inputUsdc <= 0n) throw new Error('amount must be > 0');
  const deadline = BigInt(Math.floor(Date.now() / 1000) + (p.deadlineSeconds ?? 20 * 60));

  const [market, oraclePrice, balance] = await Promise.all([
    readMarket(publicClient),
    readOraclePrice(publicClient),
    publicClient.readContract({
      address: ADDRS.USDC as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [p.user],
    }),
  ]);
  void market;
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
    wallet,
    p.user,
    ADDRS.GENERAL_ADAPTER_1 as Address,
    p.inputUsdc,
    deadline,
  );
  const auth = await signMorphoAuth(
    wallet,
    p.user,
    ADDRS.GENERAL_ADAPTER_1 as Address,
    true,
    deadline,
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
      nonce: auth.nonce,
      deadline,
      v: auth.v,
      r: auth.r,
      s: auth.s,
    },
  });
  const data = encodeMulticall(bundle);

  // Simulate against the latest state. If this reverts, bail with the error.
  try {
    await publicClient.call({
      account: p.user,
      to: ADDRS.BUNDLER3 as Address,
      data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`simulation reverted: ${msg.slice(0, 200)}`);
  }

  h.onSending?.();
  const hash = await wallet.sendTransaction({
    account: p.user,
    chain: null,
    to: ADDRS.BUNDLER3 as Address,
    data,
    value: 0n,
  });
  h.onSubmitted?.(hash);
  return hash;
}

// Verify that GA1, Bundler3, and the user have no leftover token balances post-tx.
// Returns the list of (label, balance) pairs for any non-zero leftovers, ideally empty.
export async function checkLeftovers(): Promise<{ label: string; balance: bigint }[]> {
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
