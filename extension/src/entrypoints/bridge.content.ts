import { browser } from 'wxt/browser';
import { toPageRule } from '../core';
import { NS, type BridgeToPage, type HitMessage } from '../platform/protocol';
import { loadStore, onStorageChange } from '../platform/storage';
import { MATCHES } from '../platform/matches';

// ISOLATED world: the only part of the page that can read extension storage. It relays the
// rules to the page script and the "hit" notices back to the background.
export default defineContentScript({
  matches: MATCHES,
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  main() {
    async function push() {
      const store = await loadStore();
      const msg: BridgeToPage = { [NS]: 'rules', enabled: store.enabled, rules: store.rules.map(toPageRule) };
      window.postMessage(msg, '*');
    }

    window.addEventListener('message', (e) => {
      const d = e.data as Record<string, unknown> | null;
      if (e.source !== window || !d) return;
      if (d[NS] === 'ready') void push();
      if (d[NS] === 'hit' && typeof d.id === 'string') {
        const m: HitMessage = { type: 'hit', id: d.id };
        browser.runtime.sendMessage(m).catch(() => {});
      }
    });

    onStorageChange(({ store }) => {
      if (store) void push();
    });
    void push();
  },
});
