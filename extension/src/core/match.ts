import type { PageRule, Rule } from './types';
import { validateRule } from './validate';

export type Matcher = (url: string, method: string) => PageRule | null;

export function toPageRule(rule: Rule): PageRule {
  return { id: rule.id, enabled: rule.enabled, match: rule.match, response: rule.response };
}

/** Compare URLs in their normalised form, so "https://api.com" and "https://api.com/" are the same. */
export function normalizeUrl(url: string): string {
  try {
    return new URL(url).href;
  } catch {
    return url;
  }
}

/**
 * Compiles the rules once (regexes included) and returns a function that finds the rule for a
 * request. The first matching rule wins, so a rule higher in the list has priority.
 * Disabled rules and rules with errors are left out.
 */
export function createMatcher(rules: readonly PageRule[]): Matcher {
  const compiled: { rule: PageRule; method: string; test: (url: string) => boolean }[] = [];

  for (const rule of rules) {
    if (!rule.enabled || validateRule(rule).length > 0) continue;
    let test: (url: string) => boolean;
    if (rule.match.isRegex) {
      const re = new RegExp(rule.match.url); // already validated above
      test = (url) => re.test(url);
    } else {
      const target = normalizeUrl(rule.match.url);
      test = (url) => url === target;
    }
    compiled.push({ rule, method: rule.match.method, test });
  }

  return (url, method) => {
    const m = method.toUpperCase();
    for (const c of compiled) {
      if (c.method !== 'ANY' && c.method !== m) continue;
      if (c.test(url)) return c.rule;
    }
    return null;
  };
}
