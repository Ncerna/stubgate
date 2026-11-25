import type { PageRule } from '../core';

/** Messages between the page script (MAIN world) and the bridge (ISOLATED world), over window.postMessage. */
export const NS = '__stubgate';

export type PageToBridge = { [NS]: 'ready' } | { [NS]: 'hit'; id: string };
export type BridgeToPage = { [NS]: 'rules'; enabled: boolean; rules: PageRule[] };

/** Message from the bridge to the background. */
export type HitMessage = { type: 'hit'; id: string };
