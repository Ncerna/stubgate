import type { Stats } from './types';

export interface HitIo {
  load(): Promise<Stats>;
  save(stats: Stats): Promise<void>;
}

/**
 * Counts rule uses without losing any. Hits are added up in memory and written in batches, one
 * write at a time, so many simultaneous requests cannot overwrite each other's counts (the race
 * found while reviewing the prototype). A failed write puts the batch back and retries later.
 */
export function createHitCounter(io: HitIo, flushDelayMs = 400) {
  let pending: Stats = {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const schedule = () => {
    if (!timer) {
      timer = setTimeout(() => {
        void flush();
      }, flushDelayMs);
    }
  };

  function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const batch = pending;
    pending = {};
    if (Object.keys(batch).length === 0) return chain;
    chain = chain.then(async () => {
      try {
        const current = await io.load();
        for (const [id, n] of Object.entries(batch)) current[id] = (current[id] ?? 0) + n;
        await io.save(current);
      } catch {
        for (const [id, n] of Object.entries(batch)) pending[id] = (pending[id] ?? 0) + n;
        schedule();
      }
    });
    return chain;
  }

  return {
    hit(id: string) {
      pending[id] = (pending[id] ?? 0) + 1;
      schedule();
    },
    flush,
  };
}
