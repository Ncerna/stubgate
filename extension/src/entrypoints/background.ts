import { browser } from 'wxt/browser';
import { createHitCounter } from '../core';
import type { HitMessage } from '../platform/protocol';
import { loadStats, saveStats } from '../platform/storage';

export default defineBackground(() => {
  const counter = createHitCounter({ load: loadStats, save: saveStats });
  browser.runtime.onMessage.addListener((msg: unknown) => {
    const m = msg as Partial<HitMessage> | null;
    if (m?.type === 'hit' && typeof m.id === 'string') counter.hit(m.id);
  });
  // A service worker can be stopped at any time: write pending counts when it is about to suspend.
  browser.runtime.onSuspend?.addListener(() => void counter.flush());
});
