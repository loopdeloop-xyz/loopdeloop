'use client';

import useSWR from 'swr';
import { fetchTxGasUsd } from '@/lib/gas';

// Resolves the USD gas cost for a confirmed transaction. Waits for the
// receipt then reads Chainlink ETH/USD.
export function useTxGasUsd(hash?: `0x${string}`) {
  return useSWR(
    hash ? ['tx-gas-usd', hash] : null,
    () => fetchTxGasUsd(hash!),
    { revalidateOnFocus: false, refreshInterval: 0, errorRetryCount: 1 },
  );
}
