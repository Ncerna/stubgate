import type { HttpMethod } from './types';
import { HTTP_METHODS } from './types';

export interface ParsedCurl {
  url: string;
  method: HttpMethod;
}

/** Splits a shell-like command into words, honouring single and double quotes and line continuations. */
function tokenize(input: string): string[] {
  const text = input.replace(/\\\r?\n/g, ' ');
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  let has = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < text.length) cur += text[++i];
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      has = true;
    } else if (/\s/.test(c)) {
      if (has || cur) out.push(cur);
      cur = '';
      has = false;
    } else cur += c;
  }
  if (has || cur) out.push(cur);
  return out;
}

const WITH_VALUE = new Set(['-H', '--header', '-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '-u', '--user', '-A', '--user-agent', '-e', '--referer', '-b', '--cookie', '-o', '--output', '-F', '--form']);
const BODY_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode', '-F', '--form']);

/** Reads a pasted cURL command. Returns null when the text is not one. Only URL and method are used. */
export function parseCurl(text: string): ParsedCurl | null {
  const trimmed = text.trim();
  if (!/^curl(\s|$)/i.test(trimmed)) return null;
  const tokens = tokenize(trimmed).slice(1);
  let url = '';
  let method: string | null = null;
  let hasBody = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t === '-X' || t === '--request') method = tokens[++i] ?? null;
    else if (t.startsWith('-X') && t.length > 2) method = t.slice(2);
    else if (t === '-I' || t === '--head') method = 'HEAD';
    else if (t === '--url') url = tokens[++i] ?? '';
    else if (WITH_VALUE.has(t)) {
      if (BODY_FLAGS.has(t)) hasBody = true;
      i++;
    } else if (t.startsWith('-')) continue;
    else if (!url) url = t;
  }
  if (!url) return null;
  const m = (method ?? (hasBody ? 'POST' : 'GET')).toUpperCase();
  return { url, method: (HTTP_METHODS as readonly string[]).includes(m) ? (m as HttpMethod) : 'GET' };
}
