'use client';

import { create } from 'zustand';

interface UiState {
  usdcInput: string;
  setUsdcInput: (v: string) => void;
  leverage: number;
  setLeverage: (n: number) => void;
  slippageBps: number;
  setSlippageBps: (n: number) => void;
  txOpen: boolean;
  txHash?: `0x${string}`;
  txError?: string;
  txLeverage?: number;
  txNetApy?: number;
  txStatus: 'idle' | 'signing' | 'sending' | 'pending' | 'success' | 'error';
  startTx: (snapshot?: { leverage: number; netApy: number }) => void;
  setTxSigning: () => void;
  setTxSending: () => void;
  setTxPending: (hash: `0x${string}`) => void;
  setTxSuccess: () => void;
  setTxError: (msg: string) => void;
  closeTx: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  usdcInput: '',
  setUsdcInput: (v) => set({ usdcInput: v }),
  leverage: 2.0,
  setLeverage: (n) => set({ leverage: n }),
  slippageBps: 15,
  setSlippageBps: (n) => set({ slippageBps: n }),
  txOpen: false,
  txHash: undefined,
  txError: undefined,
  txStatus: 'idle',
  startTx: (snapshot) => set({
    txOpen: true,
    txStatus: 'signing',
    txHash: undefined,
    txError: undefined,
    txLeverage: snapshot?.leverage,
    txNetApy: snapshot?.netApy,
  }),
  setTxSigning: () => set({ txStatus: 'signing' }),
  setTxSending: () => set({ txStatus: 'sending' }),
  setTxPending: (hash) => set({ txStatus: 'pending', txHash: hash }),
  setTxSuccess: () => set({ txStatus: 'success' }),
  setTxError: (msg) => set({ txStatus: 'error', txError: msg }),
  closeTx: () => set({ txOpen: false, txStatus: 'idle' }),
}));
