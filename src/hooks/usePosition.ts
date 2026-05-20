'use client';

import useSWR from 'swr';
import type { Address } from 'viem';
import { publicClient } from '@/lib/viem';
import {
  readMarket,
  readPosition,
  readOraclePrice,
  computeBorrowAssets,
  healthFactor,
  loanToValue,
  liquidationPrice,
  collateralValuePyusd,
} from '@/lib/morpho';
import { MARKET_PARAMS } from '@/lib/addresses';

export interface PositionDetail {
  collateralPrime: bigint;
  borrowShares: bigint;
  borrowAssets: bigint;
  oraclePrice: bigint;
  collateralValuePyusd: bigint;
  ltvWad: bigint;
  hfWad: bigint;
  liqPricePyusdPerPrime: bigint;
  hasPosition: boolean;
}

export function usePosition(user?: Address) {
  return useSWR(
    user ? ['position', user] : null,
    async (): Promise<PositionDetail> => {
      if (!user) throw new Error('no user');
      const [market, pos, oraclePrice] = await Promise.all([
        readMarket(publicClient),
        readPosition(publicClient, user),
        readOraclePrice(publicClient),
      ]);
      const borrowAssets = computeBorrowAssets(pos.borrowShares, market);
      return {
        collateralPrime: pos.collateral,
        borrowShares: pos.borrowShares,
        borrowAssets,
        oraclePrice,
        collateralValuePyusd: collateralValuePyusd(pos.collateral, oraclePrice),
        ltvWad: loanToValue(pos.collateral, borrowAssets, oraclePrice),
        hfWad: healthFactor(pos.collateral, borrowAssets, oraclePrice, MARKET_PARAMS.lltv),
        liqPricePyusdPerPrime: liquidationPrice(pos.collateral, borrowAssets, MARKET_PARAMS.lltv),
        hasPosition: pos.collateral > 0n || pos.borrowShares > 0n,
      };
    },
    { refreshInterval: 15_000, revalidateOnFocus: false },
  );
}
