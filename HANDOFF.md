# loopdeloop — Architecture & Handoff

A non-custodial web app at https://loopdeloop.xyz that opens leveraged long positions on Hastra's PRIME token using Morpho Blue. The whole sequence runs in a single Ethereum transaction.

User flow: connect Phantom → enter a USDC deposit → pick a leverage multiplier (1.05× to ~7.14×) → sign two off-chain messages → submit one transaction. Result: a Morpho Blue position with PRIME as collateral and PYUSD as debt.

The browser composes the calldata. The user's wallet talks directly to existing contracts (Morpho, Curve, Hastra). loopdeloop ships zero contracts of its own.

---

## On-chain mechanism

### Outer (top-level `Bundler3.multicall`)

1. `USDC.permit(user, spender=GA1, value, deadline, v, r, s)` — gasless EIP-2612 approval
2. `Morpho.setAuthorizationWithSig(...)` — gasless EIP-712 auth of GA1 to act for user
3. `GA1.erc20TransferFrom(USDC, FEE_RECIPIENT, fee)` — 1% service fee pulled from user
4. `GA1.erc20TransferFrom(USDC, GA1, net)` — remaining USDC pulled into the adapter
5. `GA1.morphoFlashLoan(PYUSD, debt, innerCalldata)` — flash-borrow PYUSD, callback runs inner

### Inner (during the flash callback, via `Bundler3.reenter`)

1. `GA1.erc20Transfer(PYUSD, CURVE_POOL, flashAmount)` — push PYUSD into Curve pool (no `approve` needed; Curve uses balance-delta)
2. `Curve.exchange_received(PYUSD → USDC, minOut, GA1)` — Curve credits the swap from the balance delta
3. `GA1.erc4626Deposit(wYLDS, MAX, MAX, GA1)` — deposit all USDC into Hastra wYLDS
4. `GA1.erc4626Deposit(PRIME, MAX, MAX, GA1)` — deposit all wYLDS into Hastra PRIME at NAV
5. `GA1.morphoSupplyCollateral(market, MAX, user, "")` — supply PRIME to Morpho on behalf of user
6. `GA1.morphoBorrow(market, debt, 0, 0, GA1)` — borrow PYUSD against the new collateral, repays the flash

All atomic. Any revert inside `inner` unwinds the entire outer bundle; the user keeps their USDC and pays only failed-gas.

Flash-callback validation: `Call.callbackHash = keccak256(reenterArgs)` so Bundler3 can verify the `reenter(innerBundle)` payload during the callback. Implementation in `src/lib/bundler.ts`.

---

## Contract addresses (Ethereum mainnet)

```
PRIME (ERC4626):          0x19ebb35279A16207Ec4ba82799CC64715065F7F6   (6 dec)
wYLDS (ERC4626):          0x6aD038cA6C04e885630851278ca0a856Ad9a66Cc   (6 dec)
USDC:                     0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48   (6 dec)
PYUSD:                    0x6c3ea9036406852006290770BEdFcAbA0e23A0e8   (6 dec)

Morpho Blue singleton:    0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb
Morpho Bundler3:          0x6566194141eefa99Af43Bb5Aa71460Ca2Dc90245
General Adapter 1 (GA1):  0x4A6c312ec70E8747a587EE860a0353cd42Be0aE0
PRIME→PYUSD oracle:       0x335e5718bC20028d5e357473a3736C187Ca6b07e
Adaptive Curve IRM:       0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC
Curve PYUSD/USDC pool:    0x383E6b4437b59fff47B619CBA855CA29342A8559

Market ID:  0x41c41d0c9aadbf4751f5ee215ed5a16954a4b34e1b70fca5393d4b08858fa3fa
Market params: loan=PYUSD, collateral=PRIME, oracle, IRM, LLTV=86%

Fee EOA: read from NEXT_PUBLIC_FEE_RECIPIENT env var (see .env.example)
```

---

## Quoting (live on-chain reads)

`src/hooks/useMarketData.ts` runs every 30 s via SWR. Four parallel reads:

1. `Morpho.market(MARKET_ID)` → `(totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee)`
2. `Oracle.price()` → PRIME→PYUSD scaled by 1e36 (since both are 6-dec)
3. `wYLDS.convertToAssets(1e6)` → USDC value per wYLDS
4. `readPrimeApyFromNav(client)` → annualised NAV delta over a 3-day block window

Then a 5th sequential read: `IRM.borrowRateView(marketParams, market)` → per-second rate in **WAD** (1e18). Continuously compounded: `apy = expm1(rate/1e18 * SECONDS_PER_YEAR)`. (Note: this is WAD, not RAY. Earlier dev iterations confused that; current code is correct.)

PRIME APY: `readPrimeApyFromNav` reads `PRIME.getVerifiedNav()` at the current block and at `now − 3 days of blocks` (~21,600 blocks). Annualised `(navNow − navPast) / navPast × 365 / dtDays`. Falls back to a hardcoded 0.0738 if the past-block read throws (which can happen on archive-restricted public RPCs).

Net APY = `primeApy × L − borrowApy × (L − 1)` where `L = 1 / (1 − LTV)`.

LTV slider cap = LLTV (86%). No safety buffer. UI does show liq price + HF.

Default Curve slippage tolerance: 15 bps. Set in `state/store.ts` and applied via `applySlippage(quote, 15)` in `lib/quote.ts`.

---

## Codebase layout

```
src/
  app/
    layout.tsx              Next 16 root; MUI AppRouterCacheProvider; HorizonLine + RpcStatusBanner mounted; Geist fonts
    page.tsx                Home: Header + PromoCard + LoopForm + ExecuteButton + QuotePanel + TxStatusModal
    positions/page.tsx      User's Morpho position (live)
    share/page.tsx          /share?lev=X&apy=Y with generateMetadata pointing OG card at /share/og
    share/og/route.tsx      Edge ImageResponse, renders 1200×630 PNG with linear PRIME-growth visual
    opengraph-image.tsx     Static homepage OG card (loopdeloop wordmark + tagline)
    providers.tsx           WagmiProvider + QueryClientProvider + MUI ThemeProvider

  components/
    Header.tsx              Logotype + nav links + ConnectButton
    LoopForm.tsx            Deposit input + MAX button + leverage slider (Zustand-backed)
    QuotePanel.tsx          Hosts useQuote(); breakdown rows; Risk section with HF colouring
    ExecuteButton.tsx       Triggers executeLoop(); disables on insufficient balance / wrong chain
    TxStatusModal.tsx       signing→sending→pending→success/error; on success shows OG-card preview + "Share on X" (intent URL only — no Web Share, no clipboard) + Download
    PromoCard.tsx           Above-fold copy + "How a loop opens" 4-step diagram with token logos
    RpcStatusBanner.tsx     Top-center pill banner when useMarketData errors persist > 2.5 s; auto-dismisses on recovery
    HorizonLine.tsx         Fixed 0.5px line at 70vh (brand)
    IntroAnimation.tsx      Session-scoped first-load draw of the LogoMark
    brand/Logo.tsx          LogoMark / LogoMarkCompact / Logotype SVG components
    brand/LoopSpinner.tsx   Animated loop SVG used during signing
    brand/TokenIcon.tsx     TokenIcon (USDC/PYUSD/PRIME) and ProtocolIcon (Morpho/Hastra)
    positions/
      ManageSection.tsx     Two tiles: "Adjust leverage" and "Close" — toggles the action panels
      AdjustLeverageAction.tsx  Single slider that targets a new LTV at preserved equity; quote + submit
      CloseAction.tsx       Percent slider (full / 25 / 50 / 75) for atomic close; quote + submit
      PositionStatCard.tsx  Live position card (collateral, debt, equity, current net APY, HF chip) + since-open PnL
      RiskCard.tsx          Liq price + HF buffer + drift-to-liquidation at current rates
      ActionPanelShell.tsx  Shared layout shell + CostBreakdown row table

  hooks/
    useMarketData.ts        SWR aggregator for market/oracle/IRM/NAV (key: 'market', 30s refresh)
    usePosition.ts          SWR per-user Morpho position; computes HF/LTV/liq price
    useUsdcBalance.ts       SWR USDC balance for the connected wallet
    useEntryBasis.ts        Reads the local v2 entry-basis ledger for PnL math
    useTxGasUsd.ts          Resolves real on-chain gas cost in USD (for the tweet share text)

  lib/
    addresses.ts            Mainnet addresses, market params, decimals, fee bps; FEE_RECIPIENT reads from env (throws if missing)
    abi.ts                  Minimal ABIs (ERC20, ERC4626 + getVerifiedNav, Morpho, Bundler3, GA1, Curve, IRM, Oracle, Uniswap V3 Router/Quoter, Chainlink)
    morpho.ts               Market/position reads; IRM math; HF/LTV/liq price; sharesToAssets up/down
    bundler.ts              Bundler3 Call[] construction for every flow (open, add, repay, close, lever up/down); flash callback hashing via keccak256(reenterArgs)
    execute.ts              Sign permit + auth → simulate via eth_call → send via walletClient; entry-basis ledger helpers; revert-selector decoding in simulateOrThrow
    sign.ts                 EIP-2612 USDC permit + EIP-712 Morpho authorization (reads contract name/version dynamically)
    loop.ts                 planLeverage(); netApy(); ltvFromLeverage(); leverageRatioFromLtv()
    apy.ts                  PRIME APY from on-chain NAV delta; fallback (0.0738) on archive-read fail or out-of-sanity result
    quote.ts                quoteCurvePyusdToUsdc / quoteCurveUsdcToPyusd / quoteUniV3PrimeToUsdc; applySlippage / inflateForSlippage
    risk.ts                 Liquidation NAV, HF-buffer bps, drift-to-liquidation
    gas.ts                  fetchTxGasUsd: receipt gasUsed × effectiveGasPrice, USD via Chainlink ETH/USD
    phantom.ts              getPhantomProvider(), PHANTOM_INSTALL_URL
    wagmi.ts                injected({ target: 'phantom' }); fallback transport over 4 public RPCs; EIP-6963 discovery enabled
    viem.ts                 publicClient with same fallback transport
    format.ts               fmtUnits / fmtPct / parseUnits / shortAddr
    theme/tokens.ts         Brand colors / radii / fonts (fonts.sans uses var(--font-geist-sans))
    theme/index.ts          MUI theme using tokens (cssVariables: true; dark mode only)

  state/
    store.ts                Zustand store: input, leverage, slippageBps, tx state

public/
  logos/{usdc.png,pyusd.png,prime.svg,morpho.webp,hastra.webp,hastra-words.png}
  favicon.svg + favicon-{16,32,192,512}.png + apple-touch-icon.png + logo-mark.svg

scripts/
  generate-favicons.mjs       Renders favicon set via sharp
  generate-twitter-assets.mjs Renders Twitter PFP (400+800) and banner (1500×500)
  screenshot-all.mjs          Playwright screenshots: app page, how-a-loop-opens crop, positions page
```

---

## Sign + simulate + send (`src/lib/execute.ts`)

```
executeLoop(walletClient, { user, inputUsdc, targetLtvWad, slippageBps }):
  1. read market + oracle price + USDC balance
  2. planLeverage() → fee, netUsdc, flashAmountPyusd, finalCollateralPrime
  3. quoteCurvePyusdToUsdc(flashAmount) → expected USDC
  4. applySlippage(expected, slippageBps) → minOut
  5. signUsdcPermit(user → GA1, inputUsdc, deadline)
  6. signMorphoAuth(user → GA1, true, deadline)
  7. buildEntryBundle({ user, fee, net, flashAmount, minOut, permit, auth }) → Call[]
  8. encodeMulticall(bundle) → calldata
  9. publicClient.call({ account: user, to: BUNDLER3, data })   // simulation
 10. walletClient.sendTransaction({ account: user, to: BUNDLER3, data, value: 0n }) → tx hash
```

Step 9 catches every revert path before the user gets a wallet popup for the on-chain send. Failures surface as `simulation reverted: <reason>` in the modal.

---

## Brand

Tokens (`src/lib/theme/tokens.ts`):

```
midnight        #0F1729   primary surface
midnightRaised  #172238   paper bg
midnightLine    #1F2E48   borders/dividers
coral           #FF6B4A   primary accent, CTAs, the trail
coralHover      #FF815F
coralPressed    #E55A3D
amber           #FFB84D   secondary accent, the plane, positive numbers
cream           #F5F1E8   primary text
creamMuted      #A8B0C0   secondary text
slate           #6B7B95   tertiary text, captions
```

Type: Geist (sans + mono), via `next/font/google`. Numerical heroes use `font-variant-numeric: tabular-nums`. Captions: 11 px, letter-spacing 0.18em, uppercase.

LogoMark: horizontal coral trail + coral loop circle + amber plane glyph (see `Logo.tsx`). LogoMarkCompact (for favicons ≤ 20 px): drops the trail, keeps the loop + plane dot.

Social emoji: ⚡ (NOT ✈️ — the plane lives in the mark; chat copy uses lightning).

---

## Tweet share UX

On a successful loop the TxStatusModal renders:
- The `share/og` image as a preview (`<img src={ogUrl}>`)
- A coral "Share on X" button that opens the Twitter intent URL (`twitter.com/intent/tweet?text=...&url=...`) in a new tab. The share page's `og:image` / `twitter:image` tags point at `/share/og`, so X's crawler scrapes the position card and renders it natively in the compose window. **No Web Share API and no clipboard write** — on macOS desktop those paths would surface the system share sheet (AirDrop/Messages/Mail) which doesn't include X as a target.
- A secondary "Download" button that downloads the OG PNG so users can attach it manually if they want.
- An Etherscan link to the tx hash

`/share/og?lev=X&apy=Y` is a Next edge route returning `ImageResponse`. The visual is a linear-growth sequence: USDC → PYUSD → PRIME → PRIME → PRIME (sizes 44 → 52 → 72 → 110 → 170 px), each connected by a coral arrow, with "3.00×" left-justified under the final PRIME and "14.50% NET APY" as the hero stat on the left column. The tx hash is **deliberately not** included in the share URL or image.

Tweet text format: `⚡ 3.00× PRIME looped. 14.50% net APY. $0.02 in gas.\nOne transaction bundled via loopdeloop.xyz`. The gas cost is read from the real on-chain receipt (`gasUsed × effectiveGasPrice`, USD-priced via Chainlink ETH/USD) — see `src/lib/gas.ts` and the `useTxGasUsd` hook.

---

## Live infrastructure

- **VPS**: `137.184.134.22` (DigitalOcean droplet, 3.8 GB RAM, hostname `address-intel`), Node 22, pnpm 11
- **App**: `/root/leverage-prime-webapp/`
- **Process**: pm2 process `loopdeloop` running `pnpm start` (Next 16 prod) on `127.0.0.1:5180`. Ecosystem file `ecosystem.config.cjs`.
- **Reverse proxy**: nginx site at `/etc/nginx/sites-enabled/loopdeloop` proxies `loopdeloop.xyz` + `www.loopdeloop.xyz` → 127.0.0.1:5180 with WS upgrade support
- **TLS**: Let's Encrypt via certbot --nginx. Account contact: `trudge.schist3414@eagereverest.com` (alias mailbox). Auto-renews via certbot systemd timer.
- **DNS**: Cloudflare Registrar, DNS-only mode (grey cloud). A records for apex + www. WHOIS state field `FL` is unredacted; rest is privacy-protected.
- **Firewall (ufw)**: 22, 80, 443 open. 5180 is bound to 127.0.0.1, not externally reachable.

---

## Repo & milestones

- Public repo: https://github.com/loopdeloop-xyz/loopdeloop (MIT)
- Current tag: `v2-open-only` at commit `536e5dc`
- Release: https://github.com/loopdeloop-xyz/loopdeloop/releases/tag/v2-open-only
- Single-commit history: the repo was force-pushed to one commit as a reset point. Future commits accumulate; tag stable points.
- Revert pattern: `git reset --hard v2-open-only && git push --force origin main`

---

## v3 management surface (shipped)

The `/positions` page exposes two tiles ("Adjust leverage", "Close"). Both run as single-transaction bundles via the same Bundler3 + GA1 path as the open flow.

- **Atomic close** (full or partial) — `executeClose` / `buildAtomicCloseBundle`. Flash-borrows PYUSD to repay debt, withdraws PRIME, sells PRIME → USDC on Uniswap V3 (0.01% fee pool, `0x5B70A1582135BD04e39CA94A6a56Fc3A828e3115`), pushes USDC into Curve to manufacture the PYUSD repayment, sweeps fee + remainder to the user. PYUSD residual (Curve overshoot + accrual buffer) is also swept to the user via a pre-quoted sweep amount; without that sweep, the residual would strand on GA1.
- **Adjust leverage** — `executeAdjustLeverage`. One slider that targets a new LTV at preserved equity. Routes to `buildLeverUpBundle` (borrow more, mint more PRIME, supply) or `buildLeverDownBundle` (repay debt, withdraw PRIME, sell, buy back PYUSD) based on direction. Same PYUSD-residual sweep on the lever-down path.
- Slippage defaults: close = 30 bps, adjust = 30 bps (vs. open's 15 bps). The wider defaults absorb the Uniswap leg's price-impact on $30k+ PRIME sales.
- 15-second quote-freshness gate in every panel: clicking submit on a stale quote forces a re-quote + re-confirmation.

## What's not in this version

- **Multi-market support** — addresses + market ID are constants. Only PRIME/PYUSD is wired.
- **Paid RPC** — using public fallback (publicnode, llamarpc server-only because no CORS in browser, cloudflare-eth, drpc). `RpcStatusBanner` surfaces fallback failure to users. Could migrate to Alchemy with domain allowlist when usage warrants.
- **Persistent state / backend / analytics** — none. Everything is read fresh from chain each session. Per-user PnL is tracked client-side via a versioned localStorage ledger (`loopdeloop:positions:v2:{user}:{marketId}`).
- **Hastra NAV redemption path** — atomic close via Uniswap is the only close route. Hastra's `requestRedeem` requires an admin to call `completeRedeem` (no user-callable claim), so a 3-day-queue redemption flow was dropped.
- **Smart-account / EIP-7702 support** — USDC permit + Morpho auth assume a pure EOA. Smart accounts (Safe, Argent, or 7702-delegated EOAs) would need to route signatures through ERC-1271, which is not wired.

---

## Identity / anonymity rules

- Project handles: `@loopdeloop` (X), `@rektonomist_` (X anon commentary persona), `loopdeloop-xyz` (GitHub).
- Never link the project to the operator's real-world identity from any anonymous surface.
- Fee EOA `0x4821913A7B4833Cf07ff32CA0924B0e602341afe` was deliberately rotated from the prior `0xC038…57E5` to break linkage with the operator's other on-chain projects. Don't undo that.
- Service signup email: alias `trudge.schist3414@eagereverest.com`.

---

## Dev commands

```bash
# On VPS (after editing or rsync from local)
cd /root/leverage-prime-webapp
pnpm install
pnpm dev          # next dev -p 5180, HMR
pnpm build        # production build
pnpm start        # next start -p 5180 (what pm2 runs)
npx tsc --noEmit  # typecheck (strict)

# Restart prod after a build
pm2 restart loopdeloop --update-env

# Logs
pm2 logs loopdeloop --lines 50 --nostream

# Generate brand assets
node scripts/generate-favicons.mjs
node scripts/generate-twitter-assets.mjs
node scripts/screenshot-all.mjs

# Required env (.env.local on VPS, gitignored)
NEXT_PUBLIC_FEE_RECIPIENT=0x4821913A7B4833Cf07ff32CA0924B0e602341afe
```

---

## Open questions / known limitations for the next iteration

1. **Oracle staleness** is not checked before quoting. Morpho's market params include an `oracleTimeout`; we should read it and surface a warning if the NAV oracle hasn't updated recently.
2. **Quote-vs-execute drift**: between user signature and on-chain inclusion, market state can change (utilization spikes → higher borrow rate → different HF). Currently no on-chain assertion that resulting HF meets a minimum; bundle just succeeds at whatever LTV results. Adding a post-condition check inside the bundle is possible via an additional GA1 call or a custom assertion contract.
3. **No on-chain allowlist check** for what address loopdeloop's bundle calldata targets. The user is trusting our client JS to compose calldata that touches only Morpho/Curve/Hastra. A bug or supply-chain compromise of our deps could theoretically construct a malicious bundle. Mitigation: simulation reverts on bad state, signatures are scoped, but no hardcoded recipient allowlist.
4. **PNG-only OG**: `share/og` returns a static PNG; would be slicker as an animated SVG but X doesn't accept SVG for media uploads.
