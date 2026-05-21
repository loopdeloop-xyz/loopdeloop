# loopdeloop

Non-custodial leveraged PRIME loops on Morpho Blue, executed in a single transaction.

[loopdeloop.xyz](https://loopdeloop.xyz)

## What it does

Looping a yield-bearing asset on mainnet is normally a chore: approve, swap, supply, borrow, then iterate to converge on your target leverage. Each iteration costs gas and swap fees.

loopdeloop packs the whole sequence into one transaction using Morpho's [Bundler3](https://docs.morpho.org/bundler/) and a PYUSD flashloan. The user signs two EIP-712 messages (a USDC permit and a Morpho authorization), then submits one transaction that:

1. Pulls USDC from the user (and skims a 1% service fee).
2. Flashloans the full target debt in PYUSD from Morpho Blue.
3. Inside the flashloan callback:
   - Swaps PYUSD → USDC on the [Curve PYUSD/USDC](https://etherscan.io/address/0x383E6b4437b59fff47B619CBA855CA29342A8559) pool.
   - Deposits the combined USDC into [wYLDS](https://etherscan.io/address/0x6aD038cA6C04e885630851278ca0a856Ad9a66Cc) (Hastra's ERC-4626 yield vault).
   - Deposits wYLDS into [PRIME](https://etherscan.io/address/0x19ebb35279A16207Ec4ba82799CC64715065F7F6) (Hastra's NAV-priced ERC-4626).
   - Supplies the resulting PRIME as Morpho collateral on the user's behalf.
   - Borrows PYUSD against it (matching the flash amount) to repay the flash.
4. The user's position is now open at the target leverage. The flashloan auto-repays.

Position state is read directly from Morpho Blue. The `/positions` page exposes in-app management: adjust leverage (lever up or lever down at preserved equity) and atomic close (full or partial back to USDC). All management flows are also single-transaction bundles.

## Mechanics

The Morpho market this app loops into:

| Field | Value |
| --- | --- |
| Market ID | `0x41c41d0c9aadbf4751f5ee215ed5a16954a4b34e1b70fca5393d4b08858fa3fa` |
| Loan asset | PYUSD |
| Collateral asset | PRIME |
| Oracle | `0x335e5718bC20028d5e357473a3736C187Ca6b07e` |
| IRM | Adaptive Curve (`0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC`) |
| LLTV | 86% |

Net APY at leverage *L* is computed as:

```
netAPY = primeAPY * L − pyusdBorrowAPY * (L − 1)
```

- `primeAPY` is derived live from the on-chain change in `PRIME.getVerifiedNav()` over a 3-day window, annualised.
- `pyusdBorrowAPY` is the Morpho Adaptive Curve IRM's `borrowRateView` (WAD per second), continuously compounded.

## Architecture

Everything runs client-side:

- Next.js 16 (App Router, React 19, MUI v7, viem 2, wagmi 3).
- Wallet: Phantom (EIP-1193 via wagmi's `injected({ target: 'phantom' })`).
- RPC: a `fallback` over four public Ethereum endpoints; no API keys required.
- Quoting: live reads against Morpho, the IRM, the PRIME NAV oracle, and the Curve pool.
- Bundle construction: viem-encoded calls to the Morpho [General Adapter 1](https://etherscan.io/address/0x4A6c312ec70E8747a587EE860a0353cd42Be0aE0) and Bundler3 (`0x6566194141eefa99Af43Bb5Aa71460Ca2Dc90245`).
- Pre-flight simulation: `eth_call` against Bundler3 before requesting the user's signature.

No backend. No funds are ever custodied by this app — the only addresses that hold tokens during the flow are the user's wallet, Morpho's General Adapter 1 (in-flight only), and the fee recipient EOA.

## Repo layout

```
src/
  app/                 Next.js routes (/, /positions, /opengraph-image)
  components/          UI (LoopForm, QuotePanel, PositionCard, brand/*)
  hooks/               SWR-backed market/position/balance reads
  lib/
    addresses.ts       Mainnet addresses, market ID, market params
    abi.ts             Minimal ABIs (ERC20, ERC4626, Morpho, Bundler3, GA1, Curve, IRM)
    morpho.ts          Market + position reads, IRM math, HF/LTV/liq price
    bundler.ts         Bundler3 call array construction
    execute.ts         Sign + simulate + send orchestration
    sign.ts            EIP-2612 USDC permit + Morpho authorization signatures
    loop.ts            Leverage planning, net APY math
    apy.ts             PRIME APY from on-chain NAV change
    quote.ts           Curve PYUSD/USDC quote
    phantom.ts         Phantom wallet detection
    wagmi.ts           wagmi config (Phantom-targeted injected connector)
    theme/             MUI theme + brand tokens
```

## Run locally

```
pnpm install
pnpm dev      # http://localhost:3000
pnpm build && pnpm start
```

`NEXT_PUBLIC_FEE_RECIPIENT` overrides the 1% fee recipient EOA. If unset, the default in `src/lib/addresses.ts` is used.

## Audit status

The smart contracts loopdeloop uses (Morpho Blue, Bundler3, GA1, Curve StableSwap NG, Hastra's wYLDS and PRIME ERC-4626 vaults) are deployed and operated by their respective teams. This app is a thin client that bundles existing on-chain calls. It performs no custody and has no upgradeable admin role over user funds.

## License

MIT. See `LICENSE`.
