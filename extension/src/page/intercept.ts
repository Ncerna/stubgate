import { createMatcher, toMockResponse, type Matcher, type MockResponseSpec, type PageRule } from '../core';
import { NS, type BridgeToPage } from '../platform/protocol';

/**
 * Runs in the PAGE's JavaScript world. Wraps fetch and XMLHttpRequest and answers matching
 * requests with the configured mock. Rules arrive from the bridge via postMessage.
 * This is the one piece that depends on how the script is injected (see inject.content.ts).
 */
export function installInterceptor(win: Window & typeof globalThis): void {
  const w = win as Window & typeof globalThis & { __stubgate?: unknown };
  if (w.__stubgate) return; // already installed in this frame
  Object.defineProperty(w, NS, { value: true, enumerable: false });

  let matcher: Matcher = () => null;
  let enabled = true;

  // Requests wait until the rules have arrived (or 1.5 s pass), so the first request of the page
  // cannot slip through before the bridge answers.
  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => (resolveReady = r));
  setTimeout(resolveReady, 1500);

  w.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as Partial<BridgeToPage> | null;
    if (e.source !== w || !d || d[NS] !== 'rules') return;
    enabled = d.enabled !== false;
    matcher = createMatcher(Array.isArray(d.rules) ? d.rules : []);
    resolveReady();
  });
  w.postMessage({ [NS]: 'ready' }, '*');

  const find = (url: string, method: string): PageRule | null => (enabled ? matcher(url, method) : null);
  const hit = (rule: PageRule) => w.postMessage({ [NS]: 'hit', id: rule.id }, '*');
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const absolute = (u: string) => {
    try {
      return new URL(u, w.location.href).href;
    } catch {
      return u;
    }
  };

  // ---- fetch ---------------------------------------------------------------
  const realFetch = w.fetch;
  w.fetch = async function (this: unknown, input: RequestInfo | URL, init?: RequestInit) {
    await ready;
    let url: string;
    let method: string;
    let signal: AbortSignal | null | undefined;
    try {
      if (input instanceof Request) {
        url = input.url;
        method = input.method;
        signal = input.signal;
      } else {
        url = absolute(String(input));
        method = 'GET';
      }
      if (init?.method) method = init.method;
      if (init?.signal) signal = init.signal;
      method = method.toUpperCase();
    } catch {
      return realFetch.call(w, input, init);
    }
    const rule = find(url, method);
    if (!rule) return realFetch.call(w, input, init);
    hit(rule);
    const spec = toMockResponse(rule);
    if (spec.delayMs) await sleep(spec.delayMs);
    if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    const res = new Response(spec.body, { status: spec.status, statusText: spec.statusText, headers: spec.headers });
    Object.defineProperty(res, 'url', { value: url });
    return res;
  };

  // ---- XMLHttpRequest ------------------------------------------------------
  const RealXHR = w.XMLHttpRequest;
  type Mocked = XMLHttpRequest & { __m?: string; __u?: string; __aborted?: boolean };

  function finish(x: Mocked, spec: MockResponseSpec) {
    const text = spec.body ?? '';
    const hdr = new Headers(spec.headers);
    const rt = x.responseType;
    let response: unknown = text;
    if (rt === 'json') {
      try {
        response = JSON.parse(text);
      } catch {
        response = null;
      }
    } else if (rt === 'arraybuffer') {
      response = new TextEncoder().encode(text).buffer;
    } else if (rt === 'blob') {
      response = new Blob([text], { type: hdr.get('content-type') ?? '' });
    }
    const def = (k: string, v: unknown) => Object.defineProperty(x, k, { configurable: true, get: () => v });
    def('readyState', 4);
    def('status', spec.status);
    def('statusText', spec.statusText);
    def('responseURL', x.__u);
    def('response', response);
    if (rt === '' || rt === 'text') def('responseText', text);
    x.getAllResponseHeaders = () => [...hdr.entries()].map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
    x.getResponseHeader = (k: string) => hdr.get(k);
    x.dispatchEvent(new Event('readystatechange'));
    x.dispatchEvent(new ProgressEvent('load'));
    x.dispatchEvent(new ProgressEvent('loadend'));
  }

  class StubXHR extends RealXHR {
    __m = 'GET';
    __u = '';
    __aborted = false;
    override open(method: string, url: string | URL, ...rest: unknown[]) {
      this.__m = String(method).toUpperCase();
      this.__u = absolute(String(url));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (super.open as any)(method, url, ...rest);
    }
    override abort() {
      this.__aborted = true;
      super.abort();
    }
    override send(body?: Document | XMLHttpRequestBodyInit | null) {
      void ready.then(() => {
        if (this.__aborted) return;
        const rule = find(this.__u, this.__m);
        if (!rule) return RealXHR.prototype.send.call(this, body);
        hit(rule);
        const spec = toMockResponse(rule);
        setTimeout(() => {
          if (!this.__aborted) finish(this, spec);
        }, spec.delayMs);
      });
    }
  }
  w.XMLHttpRequest = StubXHR;
}
