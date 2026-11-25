import { describe, expect, it } from 'vitest';
import { createDefaultStore, newRule } from './defaults';
import { migrate } from './migrate';

describe('migrate', () => {
  it.each([undefined, null, 'text', 42, [], true])('turns %j into a default store', (raw) => {
    expect(migrate(raw)).toEqual(createDefaultStore());
  });

  it('keeps a valid store as it is', () => {
    const store = createDefaultStore();
    store.enabled = false;
    store.rules = [newRule({ label: 'users', match: { url: 'https://api.com/users', method: 'POST' } })];
    store.settings.language = 'es';
    expect(migrate(JSON.parse(JSON.stringify(store)))).toEqual(store);
  });

  it('drops rules without an id and fills in the missing fields of the others', () => {
    const store = migrate({ rules: [{ label: 'no id' }, { id: 'a', match: { url: 'https://x.com' } }, 7, null] });
    expect(store.rules).toHaveLength(1);
    expect(store.rules[0]).toMatchObject({
      id: 'a',
      enabled: true,
      match: { method: 'GET', url: 'https://x.com', isRegex: false },
      response: { status: 200, delayMs: 0, headers: {}, body: '' },
    });
  });

  it('replaces values of the wrong type with defaults and never throws', () => {
    const store = migrate({
      enabled: 'yes',
      settings: { language: 'fr', theme: 3 },
      rules: [{ id: 'a', match: { method: 'FETCH', url: 5 }, response: { status: '200', headers: { a: 1, b: 'ok' } } }],
    });
    expect(store.enabled).toBe(true);
    expect(store.settings).toEqual({ language: 'auto', theme: 'dark' });
    expect(store.rules[0]?.match).toMatchObject({ method: 'GET', url: '' });
    expect(store.rules[0]?.response).toMatchObject({ status: 200, headers: { b: 'ok' } });
  });
});
