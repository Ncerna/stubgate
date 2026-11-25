import { createDefaultStore } from './defaults';
import { HTTP_METHODS, SCHEMA_VERSION, type HttpMethod, type Rule, type Settings, type Store } from './types';

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number) => (typeof v === 'number' && Number.isInteger(v) ? v : d);

function sanitizeHeaders(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (isObject(v)) {
    for (const [k, val] of Object.entries(v)) if (typeof val === 'string') out[k] = val;
  }
  return out;
}

function sanitizeRule(raw: unknown): Rule | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id === '') return null;
  const match = isObject(raw.match) ? raw.match : {};
  const response = isObject(raw.response) ? raw.response : {};
  const method = HTTP_METHODS.includes(match.method as HttpMethod) ? (match.method as HttpMethod) : 'GET';
  return {
    id: raw.id,
    label: str(raw.label, ''),
    enabled: bool(raw.enabled, true),
    type: 'mock',
    match: { method, url: str(match.url, ''), isRegex: bool(match.isRegex, false) },
    response: {
      status: int(response.status, 200),
      delayMs: int(response.delayMs, 0),
      headers: sanitizeHeaders(response.headers),
      body: str(response.body, ''),
    },
    notes: str(raw.notes, ''),
  };
}

function sanitizeSettings(raw: unknown, base: Settings): Settings {
  if (!isObject(raw)) return base;
  return {
    language: raw.language === 'en' || raw.language === 'es' || raw.language === 'auto' ? raw.language : base.language,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : base.theme,
  };
}

/**
 * Turns whatever is in storage into a valid Store. It never throws: an unknown or damaged value
 * becomes a default one. When the schema changes, add a step here for each old version.
 */
export function migrate(raw: unknown): Store {
  const store = createDefaultStore();
  if (!isObject(raw)) return store;
  // schema 1 is the current one; older versions would be upgraded here before the sanitising below.
  store.schema = SCHEMA_VERSION;
  store.enabled = bool(raw.enabled, true);
  if (Array.isArray(raw.rules)) {
    store.rules = raw.rules.map(sanitizeRule).filter((r): r is Rule => r !== null);
  }
  store.settings = sanitizeSettings(raw.settings, store.settings);
  return store;
}
