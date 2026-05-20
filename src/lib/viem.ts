'use client';

import { createPublicClient, fallback, http, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';

const PUBLIC_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.llamarpc.com',
  'https://cloudflare-eth.com',
  'https://eth.drpc.org',
];

export const publicClient: PublicClient = createPublicClient({
  chain: mainnet,
  transport: fallback(PUBLIC_RPCS.map((url) => http(url, { batch: true }))),
});
