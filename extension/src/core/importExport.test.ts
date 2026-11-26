import { describe, expect, it } from 'vitest';
import { newRule } from './defaults';
import { applyImport, buildExport, exportFilename, parseImport } from './importExport';

const mk = (label: string) => newRule({ label, match: { url: 'https://api.com/' + label } });

describe('export', () => {
  it('names the file with the date and includes app, version and exportedAt', () => {
    const now = new Date(2026, 10, 5, 12);
    expect(exportFilename(now)).toBe('stubgate-rules-2026-11-05.json');
    const { json } = buildExport([mk('a')], now);
    expect(JSON.parse(json)).toMatchObject({ app: 'stubgate', version: 1, rules: [{ label: 'a' }] });
    expect(JSON.parse(json).exportedAt).toBe(now.toISOString());
  });
});

describe('parseImport', () => {
  it('round-trips an export', () => {
    const rules = [mk('a'), mk('b')];
    const parsed = parseImport(buildExport(rules).json);
    expect(parsed).toEqual({ ok: true, rules });
  });
  it.each(['', 'not json', '{}', '[]', '{"app":"other","rules":[]}', '{"app":"stubgate"}'])('rejects %j', (text) => {
    expect(parseImport(text)).toEqual({ ok: false });
  });
  it('cleans damaged rules instead of trusting them', () => {
    const p = parseImport(JSON.stringify({ app: 'stubgate', rules: [{ id: 'a', response: { status: 'x' } }, 5] }));
    expect(p.ok && p.rules).toHaveLength(1);
    expect(p.ok && p.rules[0]!.response.status).toBe(200);
  });
});

describe('applyImport', () => {
  it('add: new ids, imported first, existing kept, repeated names renamed', () => {
    const existing = [mk('users'), mk('orders')];
    const incoming = [mk('users'), mk('users'), mk('fresh')];
    const out = applyImport(existing, incoming, 'add');
    expect(out.map((r) => r.label)).toEqual(['users (2)', 'users (3)', 'fresh', 'users', 'orders']);
    expect(new Set(out.map((r) => r.id)).size).toBe(out.length);
    expect(incoming.every((r) => !out.some((o) => o.id === r.id))).toBe(true);
  });
  it('replace: only the imported rules remain, with their names untouched', () => {
    const out = applyImport([mk('users')], [mk('users')], 'replace');
    expect(out.map((r) => r.label)).toEqual(['users']);
  });
  it('never renames unnamed rules', () => {
    expect(applyImport([mk('')], [mk('')], 'add').map((r) => r.label)).toEqual(['', '']);
  });
});
