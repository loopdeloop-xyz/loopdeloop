import type { Address, PublicClient } from 'viem';
import { ADDRS, MARKET_ID, MARKET_PARAMS } from './addresses';
import { MORPHO_ABI, ORACLE_ABI, IRM_ABI, STAKING_VAULT_ABI, ERC4626_ABI } from './abi';

const WAD = 10n ** 18n;
const RAY = 10n ** 27n;
const VIRTUAL_ASSETS = 1n;
const VIRTUAL_SHARES = 10n ** 6n;
const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n;

export interface MarketState {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

export interface Position {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
}

export async function readMarket(client: PublicClient): Promise<MarketState> {
  const out = await client.readContract({
    address: ADDRS.MORPHO as Address,
    abi: MORPHO_ABI,
    functionName: 'market',
    args: [MARKET_ID],
  });
  const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee] = out;
  return {
    totalSupplyAssets,
    totalSupplyShares,
    totalBorrowAssets,
    totalBorrowShares,
    lastUpdate,
    fee,
  };
}

export async function readPosition(client: PublicClient, user: Address): Promise<Position> {
  const out = await client.readContract({
    address: ADDRS.MORPHO as Address,
    abi: MORPHO_ABI,
    functionName: 'position',
    args: [MARKET_ID, user],
  });
  const [supplyShares, borrowShares, collateral] = out;
  return { supplyShares, borrowShares, collateral };
}

export async function readOraclePrice(client: PublicClient): Promise<bigint> {
  return await client.readContract({
    address: MARKET_PARAMS.oracle,
    abi: ORACLE_ABI,
    functionName: 'price',
  });
}

export async function readBorrowRatePerSecond(client: PublicClient, market: MarketState): Promise<bigint> {
  return await client.readContract({
    address: MARKET_PARAMS.irm,
    abi: IRM_ABI,
    functionName: 'borrowRateView',
    args: [
      MARKET_PARAMS,
      {
        totalSupplyAssets: market.totalSupplyAssets,
        totalSupplyShares: market.totalSupplyShares,
        totalBorrowAssets: market.totalBorrowAssets,
        totalBorrowShares: market.totalBorrowShares,
        lastUpdate: market.lastUpdate,
        fee: market.fee,
      },
    ],
  });
}

// Borrow APY from per-second rate using Morpho's continuous compounding convention:
// APY = e^(rate_per_sec * SECONDS_PER_YEAR) - 1.
// Morpho's IIrm.borrowRateView returns the rate per second in WAD (1e18), not RAY.
export function borrowApyFromRate(ratePerSecond: bigint): number {
  const rPerSecFloat = Number(ratePerSecond) / 1e18;
  const annualLn = rPerSecFloat * Number(SECONDS_PER_YEAR);
  return Math.expm1(annualLn);
}

export async function readNav(client: PublicClient): Promise<bigint> {
  return await client.readContract({
    address: ADDRS.PRIME as Address,
    abi: STAKING_VAULT_ABI,
    functionName: 'getVerifiedNav',
  });
}

export async function readWyldsAssetsPerShare(client: PublicClient): Promise<bigint> {
  return await client.readContract({
    address: ADDRS.wYLDS as Address,
    abi: ERC4626_ABI,
    functionName: 'convertToAssets',
    args: [10n ** 6n],
  });
}

export function sharesToAssetsDown(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  return (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
}

export function sharesToAssetsUp(shares: bigint, totalAssets: bigint, totalShares: bigint): bigint {
  const num = shares * (totalAssets + VIRTUAL_ASSETS);
  const den = totalShares + VIRTUAL_SHARES;
  return (num + den - 1n) / den;
}

export function computeBorrowAssets(borrowShares: bigint, market: MarketState): bigint {
  if (borrowShares === 0n) return 0n;
  return sharesToAssetsUp(borrowShares, market.totalBorrowAssets, market.totalBorrowShares);
}

// Collateral value (in PYUSD, 6dp) given collateral PRIME (6dp) and oracle price (1e36 scaled for 6/6 pair).
export function collateralValuePyusd(collateralPrime: bigint, oraclePrice: bigint): bigint {
  return (collateralPrime * oraclePrice) / RAY / 10n ** 9n;
}

// Health factor scaled to 1e18. HF = (collateral * price * lltv) / (borrow * 1e36).
// Returns max uint if borrow == 0.
export function healthFactor(collateralPrime: bigint, borrowAssets: bigint, oraclePrice: bigint, lltv: bigint): bigint {
  if (borrowAssets === 0n) return 2n ** 255n;
  const maxBorrow = (collateralPrime * oraclePrice) / RAY / 10n ** 9n;
  return (maxBorrow * lltv) / borrowAssets;
}

// LTV scaled to 1e18.
export function loanToValue(collateralPrime: bigint, borrowAssets: bigint, oraclePrice: bigint): bigint {
  if (collateralPrime === 0n) return 0n;
  const collValue = (collateralPrime * oraclePrice) / RAY / 10n ** 9n;
  if (collValue === 0n) return 0n;
  return (borrowAssets * WAD) / collValue;
}

// Liquidation price in USD per PRIME (returned as 1e6-scaled like USDC).
// liqPrice = (borrowAssets * 1e18) / (collateral * lltv) in PYUSD-per-PRIME terms.
export function liquidationPrice(collateralPrime: bigint, borrowAssets: bigint, lltv: bigint): bigint {
  if (collateralPrime === 0n || lltv === 0n) return 0n;
  return (borrowAssets * WAD) / ((collateralPrime * lltv) / WAD);
}

export { WAD, RAY, SECONDS_PER_YEAR };
