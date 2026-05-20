'use client';

import useSWR from 'swr';
import type { Address } from 'viem';
import { publicClient } from '@/lib/viem';
import { ADDRS } from '@/lib/addresses';
import { ERC20_ABI } from '@/lib/abi';

export function useUsdcBalance(user?: Address) {
  return useSWR(
    user ? ['usdcBalance', user] : null,
    async () => {
      if (!user) return 0n;
      return await publicClient.readContract({
        address: ADDRS.USDC as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [user],
      });
    },
    { refreshInterval: 15_000, revalidateOnFocus: false },
  );
}
