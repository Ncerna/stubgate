(() => { const api = typeof browser !== 'undefined' ? browser : chrome; const s = document.createElement('script'); s.src = api.runtime.getURL('inject.js'); s.async = false; document.documentElement.appendChild(s); s.onload = () => s.remove(); })();
// Runs in the extension's ISOLATED world. It is the only part that can read extension
// storage, so it relays rules to the page script and relays "hit" notices back.
(() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const NS = '__stubgate';

  async function push() {
    const { rules = [], enabled = true } = await api.storage.local.get(['rules', 'enabled']);
    window.postMessage({ [NS]: 'rules', rules, enabled }, '*');
  }

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (e.source !== window || !d) return;
    if (d[NS] === 'ready') push();
    if (d[NS] === 'hit') api.runtime.sendMessage({ type: 'hit', id: d.id }).catch(() => {});
  });

  api.storage.onChanged.addListener((changes) => {
    if (changes.rules || changes.enabled) push();
  });

  push();
})();
