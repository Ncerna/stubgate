import { browser } from 'wxt/browser';
import { createDefaultStore, migrate, type Stats, type Store } from '../core';

const STORE_KEY = 'store';
const STATS_KEY = 'stats';

/** The only file that touches the browser storage API. */
export async function loadStore(): Promise<Store> {
  const data = await browser.storage.local.get(STORE_KEY);
  return data[STORE_KEY] === undefined ? createDefaultStore() : migrate(data[STORE_KEY]);
}

export async function saveStore(store: Store): Promise<void> {
  await browser.storage.local.set({ [STORE_KEY]: store });
}

export async function loadStats(): Promise<Stats> {
  const data = await browser.storage.local.get(STATS_KEY);
  const raw = data[STATS_KEY];
  return typeof raw === 'object' && raw !== null ? (raw as Stats) : {};
}

export async function saveStats(stats: Stats): Promise<void> {
  await browser.storage.local.set({ [STATS_KEY]: stats });
}

/** Calls `fn` whenever the store or the stats change (from any extension page). Returns the unsubscribe function. */
export function onStorageChange(fn: (changed: { store: boolean; stats: boolean }) => void): () => void {
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area !== 'local') return;
    if (STORE_KEY in changes || STATS_KEY in changes) fn({ store: STORE_KEY in changes, stats: STATS_KEY in changes });
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
