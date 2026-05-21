'use client';

import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { readEntryBasis, type EntryBasis } from '@/lib/execute';

// Reads the entry-basis entry from localStorage for the connected user.
// Returns undefined if no entry exists (position opened outside loopdeloop,
// or localStorage was cleared).
export function useEntryBasis(user?: Address): EntryBasis | undefined {
  const [entry, setEntry] = useState<EntryBasis | undefined>(undefined);
  useEffect(() => {
    if (!user) {
      setEntry(undefined);
      return;
    }
    setEntry(readEntryBasis(user));
  }, [user]);
  return entry;
}
