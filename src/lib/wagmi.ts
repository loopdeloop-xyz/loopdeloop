'use client';

import { http, createConfig, fallback } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

const transport = fallback([
  http('https://ethereum-rpc.publicnode.com'),
  http('https://eth.llamarpc.com'),
  http('https://cloudflare-eth.com'),
  http('https://eth.drpc.org'),
]);

// EIP-6963 announces ("multiInjectedProviderDiscovery") surface Phantom as
// an additional connector with id == 'app.phantom'. The configured injected
// connector below is the legacy-target fallback for older Phantom versions.
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [
    injected({ target: 'phantom', shimDisconnect: true }),
  ],
  transports: { [mainnet.id]: transport },
  ssr: true,
  multiInjectedProviderDiscovery: true,
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
