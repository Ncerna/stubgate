// Counts how many times each rule answered a request.
const api = typeof browser !== 'undefined' ? browser : chrome;

api.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'hit') {
    api.storage.local.get('hits').then(({ hits = {} }) =>
      api.storage.local.set({ hits: { ...hits, [msg.id]: (hits[msg.id] || 0) + 1 } })
    );
  }
});
