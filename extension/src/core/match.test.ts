import { describe, expect, it } from 'vitest';
import { newRule } from './defaults';
import { createMatcher } from './match';
import type { Rule } from './types';

const rule = (url: string, match: Partial<Rule['match']> = {}, extra: Partial<Rule> = {}) =>
  ({ ...newRule({ match: { url, ...match } }), ...extra }) as Rule;

describe('createMatcher', () => {
  it('matches an exact URL and method', () => {
    const r = rule('https://api.com/users');
    const m = createMatcher([r]);
    expect(m('https://api.com/users', 'GET')?.id).toBe(r.id);
    expect(m('https://api.com/users', 'POST')).toBeNull();
    expect(m('https://api.com/users?page=2', 'GET')).toBeNull();
  });

  it('treats a host with and without the trailing slash as the same URL', () => {
    const m = createMatcher([rule('https://api.com')]);
    expect(m('https://api.com/', 'GET')).not.toBeNull();
  });

  it('ANY matches every method, and the method is case-insensitive', () => {
    const m = createMatcher([rule('https://api.com/x', { method: 'ANY' })]);
    expect(m('https://api.com/x', 'delete')).not.toBeNull();
    expect(m('https://api.com/x', 'PATCH')).not.toBeNull();
  });

  it('matches with a regular expression', () => {
    const m = createMatcher([rule('/customers/\\d+$', { isRegex: true })]);
    expect(m('https://api.com/customers/42', 'GET')).not.toBeNull();
    expect(m('https://api.com/customers/abc', 'GET')).toBeNull();
  });

  it('skips disabled rules', () => {
    const m = createMatcher([rule('https://api.com/x', {}, { enabled: false })]);
    expect(m('https://api.com/x', 'GET')).toBeNull();
  });

  it('first matching rule wins (higher in the list has priority)', () => {
    const first = rule('https://api.com/x');
    const second = rule('https://api.com/x');
    expect(createMatcher([first, second])('https://api.com/x', 'GET')?.id).toBe(first.id);
    expect(createMatcher([second, first])('https://api.com/x', 'GET')?.id).toBe(second.id);
  });

  it('ignores a rule with an invalid regex instead of throwing', () => {
    expect(() => createMatcher([rule('(unclosed', { isRegex: true })])).not.toThrow();
    expect(createMatcher([rule('(unclosed', { isRegex: true })])('(unclosed', 'GET')).toBeNull();
  });

  it('ignores a rule whose status would make new Response() throw', () => {
    const bad = rule('https://api.com/x');
    bad.response.status = 99;
    expect(createMatcher([bad])('https://api.com/x', 'GET')).toBeNull();
  });

  it('ignores a rule without a URL', () => {
    expect(createMatcher([rule('')])('', 'GET')).toBeNull();
  });
});
