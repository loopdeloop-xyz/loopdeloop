import type { Address, Hex } from 'viem';
import { publicClient } from './viem';
import { ADDRS } from './addresses';
import { CHAINLINK_AGGREGATOR_ABI } from './abi';

// Fetches the actual gas spent on a transaction in USD by reading the
// receipt (gasUsed * effectiveGasPrice) and the Chainlink ETH/USD oracle.
// Resolves when the receipt is mined; rejects on RPC error.
export async function fetchTxGasUsd(hash: Hex): Promise<number> {
  const [receipt, round] = await Promise.all([
    publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 }),
    publicClient.readContract({
      address: ADDRS.CHAINLINK_ETH_USD as Address,
      abi: CHAINLINK_AGGREGATOR_ABI,
      functionName: 'latestRoundData',
    }),
  ]);
  // viem returns `effectiveGasPrice` on every receipt for EIP-1559 chains.
  const weiSpent = receipt.gasUsed * receipt.effectiveGasPrice;
  const ethSpent = Number(weiSpent) / 1e18;
  const ethUsd = Number(round[1]) / 1e8;
  return ethSpent * ethUsd;
}
