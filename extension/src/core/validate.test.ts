import { describe, expect, it } from 'vitest';
import { newRule } from './defaults';
import { checkJson, jsonErrorLine, validateRule } from './validate';

const ok = () => newRule({ match: { url: 'https://api.com/x' } });
const codes = (r: ReturnType<typeof ok>) => validateRule(r).map((e) => e.code);

describe('validateRule', () => {
  it('accepts a normal rule', () => {
    expect(codes(ok())).toEqual([]);
  });

  it('requires a URL', () => {
    expect(codes(newRule())).toContain('urlRequired');
    expect(codes(newRule({ match: { url: '   ' } }))).toContain('urlRequired');
  });

  it('rejects an invalid regular expression only when regex mode is on', () => {
    expect(codes(newRule({ match: { url: '(x', isRegex: true } }))).toContain('invalidRegex');
    expect(codes(newRule({ match: { url: '(x', isRegex: false } }))).toEqual([]);
  });

  it.each([199, 600, 200.5, Number.NaN, 0])('rejects status %s', (status) => {
    const r = ok();
    r.response.status = status;
    expect(codes(r)).toContain('status');
  });

  it.each([200, 404, 599])('accepts status %i', (status) => {
    const r = ok();
    r.response.status = status;
    expect(codes(r)).toEqual([]);
  });

  it.each([-1, 60_001, 1.5])('rejects delay %s', (delayMs) => {
    const r = ok();
    r.response.delayMs = delayMs;
    expect(codes(r)).toContain('delay');
  });

  it('rejects a bad header name, and a value with a line break or non-latin1 characters', () => {
    const a = ok();
    a.response.headers = { 'Bad Name': 'x' };
    const b = ok();
    b.response.headers = { 'X-A': 'line\nbreak' };
    const c = ok();
    c.response.headers = { 'X-A': 'ñandú ✓' };
    expect(codes(a)).toContain('headerName');
    expect(codes(b)).toContain('headerValue');
    expect(codes(c)).toContain('headerValue');
  });

  it('ignores an empty header row but not a value without a name', () => {
    const a = ok();
    a.response.headers = { ...a.response.headers, '': '' };
    const b = ok();
    b.response.headers = { '': 'x' };
    expect(codes(a)).toEqual([]);
    expect(codes(b)).toContain('headerName');
  });

  it('everything it accepts is accepted by the platform too', () => {
    const r = ok();
    r.response.headers = { 'X-Custom_1': 'valor', 'Content-Type': 'text/plain; charset=utf-8' };
    expect(codes(r)).toEqual([]);
    expect(() => new Response('x', { status: r.response.status, headers: r.response.headers })).not.toThrow();
  });
});

describe('checkJson', () => {
  it('tells valid, invalid and empty bodies apart', () => {
    expect(checkJson('{"a":1}')).toBe('valid');
    expect(checkJson('{"a":')).toBe('invalid');
    expect(checkJson('  ')).toBe('empty');
  });
});

describe('jsonErrorLine', () => {
  it('is null for valid and empty bodies', () => {
    expect(jsonErrorLine('{"a":1}')).toBeNull();
    expect(jsonErrorLine('')).toBeNull();
  });
  it('never throws on a broken body and returns a positive line when the engine reports one', () => {
    const line = jsonErrorLine('{\n  "a": 1,\n  "b": \n}');
    expect(line === null || line >= 1).toBe(true);
  });
});
