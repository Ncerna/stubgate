import type { Rule } from './types';

export const LIMITS = { statusMin: 200, statusMax: 599, delayMax: 60_000 } as const;

export type RuleErrorCode = 'urlRequired' | 'invalidRegex' | 'status' | 'delay' | 'headerName' | 'headerValue';
export interface RuleError {
  field: 'url' | 'status' | 'delay' | 'headers';
  code: RuleErrorCode;
}

// RFC 9110 "token": the characters allowed in a header name.
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
// Header values must be bytes (ISO-8859-1) and cannot contain line breaks.
const BAD_HEADER_VALUE = /[\r\n]|[^\u0000-ÿ]/;

/**
 * A rule with errors is never applied: `new Response()` throws for a status outside 200-599
 * or for an invalid header, and that would break the user's page instead of mocking it.
 */
export function validateRule(rule: Pick<Rule, 'match' | 'response'>): RuleError[] {
  const errors: RuleError[] = [];

  if (!rule.match.url.trim()) {
    errors.push({ field: 'url', code: 'urlRequired' });
  } else if (rule.match.isRegex) {
    try {
      new RegExp(rule.match.url);
    } catch {
      errors.push({ field: 'url', code: 'invalidRegex' });
    }
  }

  const { status, delayMs, headers } = rule.response;
  if (!Number.isInteger(status) || status < LIMITS.statusMin || status > LIMITS.statusMax) {
    errors.push({ field: 'status', code: 'status' });
  }
  if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > LIMITS.delayMax) {
    errors.push({ field: 'delay', code: 'delay' });
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name === '' && value === '') continue; // an empty row the user has just added
    if (!HEADER_NAME.test(name)) {
      errors.push({ field: 'headers', code: 'headerName' });
      break;
    }
    if (BAD_HEADER_VALUE.test(value)) {
      errors.push({ field: 'headers', code: 'headerValue' });
      break;
    }
  }
  return errors;
}

export type JsonState = 'valid' | 'invalid' | 'empty';

/** Only informative: a broken JSON body can be saved on purpose, to simulate a broken API. */
export function checkJson(body: string): JsonState {
  if (!body.trim()) return 'empty';
  try {
    JSON.parse(body);
    return 'valid';
  } catch {
    return 'invalid';
  }
}

/**
 * Where a JSON body breaks, when the engine says so (line 1-based). Null when the body is valid,
 * empty, or the engine gives no position (messages differ between browsers).
 */
export function jsonErrorLine(body: string): number | null {
  if (!body.trim()) return null;
  try {
    JSON.parse(body);
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const line = /line (\d+)/.exec(msg);
    if (line) return Number(line[1]);
    const pos = /position (\d+)/.exec(msg);
    if (pos) return body.slice(0, Number(pos[1])).split('\n').length;
    return null;
  }
}
