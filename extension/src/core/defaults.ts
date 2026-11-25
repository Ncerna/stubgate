import { SCHEMA_VERSION, type Rule, type Store } from './types';

export const DEFAULT_BODY = '{ "message": "OK", "data": [] }';

export function createId(): string {
  return globalThis.crypto.randomUUID();
}

export function createDefaultStore(): Store {
  return {
    schema: SCHEMA_VERSION,
    enabled: true,
    rules: [],
    settings: { language: 'auto', theme: 'dark' },
  };
}

interface RuleOverrides {
  label?: string;
  enabled?: boolean;
  notes?: string;
  match?: Partial<Rule['match']>;
  response?: Partial<Rule['response']>;
}

export function newRule(overrides: RuleOverrides = {}): Rule {
  return {
    id: createId(),
    label: overrides.label ?? '',
    enabled: overrides.enabled ?? true,
    type: 'mock',
    match: { method: 'GET', url: '', isRegex: false, ...overrides.match },
    response: {
      status: 200,
      delayMs: 0,
      headers: { 'Content-Type': 'application/json' },
      body: DEFAULT_BODY,
      ...overrides.response,
    },
    notes: overrides.notes ?? '',
  };
}
