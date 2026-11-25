import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stats, Store } from '../core';
import { loadStats, loadStore, onStorageChange, saveStore } from '../platform/storage';

/** Popup state: loads the store, saves every change at once (the popup can close at any moment). */
export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const latest = useRef<Store | null>(null);
  const writing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    void loadStore().then((s) => {
      latest.current = s;
      setStore(s);
    });
    void loadStats().then(setStats);
    return onStorageChange(({ stats: st }) => {
      if (st) void loadStats().then(setStats);
    });
  }, []);

  const persist = useCallback(async () => {
    if (writing.current) {
      dirty.current = true;
      return;
    }
    writing.current = true;
    try {
      do {
        dirty.current = false;
        if (latest.current) await saveStore(latest.current);
      } while (dirty.current);
    } finally {
      writing.current = false;
    }
  }, []);

  const update = useCallback(
    (fn: (s: Store) => Store) => {
      if (!latest.current) return;
      latest.current = fn(latest.current);
      setStore(latest.current);
      void persist();
    },
    [persist],
  );

  return { store, stats, update };
}
