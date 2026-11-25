// Runs in the PAGE's JavaScript world. Wraps fetch and XMLHttpRequest and answers
// matching requests with the configured mock. Rules arrive from bridge.js via postMessage.
(() => {
  'use strict';
  if (window.__stubgate) return;
  const NS = '__stubgate';
  const state = { enabled: true, rules: [] };
  Object.defineProperty(window, NS, { value: state, enumerable: false });

  // Requests wait until the rules have arrived (or 1.5 s pass), so the very first
  // request of the page cannot slip through before the bridge has answered.
  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));
  setTimeout(resolveReady, 1500);

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d || d[NS] !== 'rules') return;
    state.enabled = d.enabled;
    state.rules = d.rules;
    resolveReady();
  });
  window.postMessage({ [NS]: 'ready' }, '*');

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hit = (rule) => window.postMessage({ [NS]: 'hit', id: rule.id }, '*');

  // First matching rule wins (a rule higher in the list has priority).
  function find(url, method) {
    if (!state.enabled) return null;
    for (const r of state.rules) {
      if (!r.enabled) continue;
      if (r.method !== 'ANY' && r.method !== method) continue;
      try {
        if (r.isRegex ? new RegExp(r.url).test(url) : r.url === url) return r;
      } catch { /* invalid regex: ignore this rule */ }
    }
    return null;
  }

  // ---- fetch ---------------------------------------------------------------
  const realFetch = window.fetch;
  window.fetch = async function (input, init) {
    await ready;
    let url, method;
    try {
      if (input instanceof Request) {
        url = input.url;
        method = input.method;
      } else {
        url = new URL(String(input), location.href).href;
        method = 'GET';
      }
      if (init && init.method) method = init.method;
      method = method.toUpperCase();
    } catch {
      return realFetch.apply(this, arguments);
    }
    const rule = find(url, method);
    if (!rule) return realFetch.apply(this, arguments);
    hit(rule);
    if (rule.delayMs) await sleep(rule.delayMs);
    const nullBody = [101, 204, 205, 304].includes(rule.status);
    const res = new Response(nullBody ? null : rule.body, {
      status: rule.status,
      statusText: rule.statusText || '',
      headers: rule.headers,
    });
    Object.defineProperty(res, 'url', { value: url });
    return res;
  };

  // ---- XMLHttpRequest ------------------------------------------------------
  const RealXHR = window.XMLHttpRequest;
  function finish(x, rule) {
    const text = rule.body == null ? '' : String(rule.body);
    const hdr = new Headers(rule.headers);
    const rt = x.responseType;
    let response = text;
    if (rt === 'json') {
      try { response = JSON.parse(text); } catch { response = null; }
    } else if (rt === 'arraybuffer') {
      response = new TextEncoder().encode(text).buffer;
    } else if (rt === 'blob') {
      response = new Blob([text], { type: hdr.get('content-type') || '' });
    }
    const def = (k, v) => Object.defineProperty(x, k, { configurable: true, get: () => v });
    def('readyState', 4);
    def('status', rule.status);
    def('statusText', rule.statusText || '');
    def('responseURL', x.__u);
    def('response', response);
    if (rt === '' || rt === 'text') def('responseText', text);
    x.getAllResponseHeaders = () =>
      [...hdr.entries()].map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n';
    x.getResponseHeader = (k) => hdr.get(k);
    x.dispatchEvent(new Event('readystatechange'));
    x.dispatchEvent(new ProgressEvent('load'));
    x.dispatchEvent(new ProgressEvent('loadend'));
  }

  class StubXHR extends RealXHR {
    open(method, url, ...rest) {
      this.__m = String(method).toUpperCase();
      try { this.__u = new URL(String(url), location.href).href; } catch { this.__u = String(url); }
      return super.open(method, url, ...rest);
    }
    send(body) {
      ready.then(() => {
        const rule = find(this.__u, this.__m);
        if (!rule) return RealXHR.prototype.send.call(this, body);
        hit(rule);
        setTimeout(() => finish(this, rule), rule.delayMs || 0);
      });
    }
  }
  window.XMLHttpRequest = StubXHR;
})();
