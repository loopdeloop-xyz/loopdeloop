'use client';

import useSWR from 'swr';
import { publicClient } from '@/lib/viem';
import {
  readMarket,
  readOraclePrice,
  readBorrowRatePerSecond,
  borrowApyFromRate,
  readWyldsAssetsPerShare,
} from '@/lib/morpho';
import { readPrimeApyFromNav } from '@/lib/apy';

export interface MarketData {
  totalSupplyAssets: bigint;
  totalBorrowAssets: bigint;
  oraclePrice: bigint;
  borrowApy: number;
  primeApy: number;
  primeApySource: 'live' | 'fallback';
  wyldsAssetsPerShare: bigint;
}

async function fetcher(): Promise<MarketData> {
  const [market, oraclePrice, wyldsAssetsPerShare, primeApyInfo] = await Promise.all([
    readMarket(publicClient),
    readOraclePrice(publicClient),
    readWyldsAssetsPerShare(publicClient),
    readPrimeApyFromNav(publicClient),
  ]);
  const ratePerSec = await readBorrowRatePerSecond(publicClient, market);
  const borrowApy = borrowApyFromRate(ratePerSec);
  return {
    totalSupplyAssets: market.totalSupplyAssets,
    totalBorrowAssets: market.totalBorrowAssets,
    oraclePrice,
    borrowApy,
    primeApy: primeApyInfo.apy,
    primeApySource: primeApyInfo.source,
    wyldsAssetsPerShare,
  };
}

export function useMarketData() {
  return useSWR<MarketData>('market', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });
}
