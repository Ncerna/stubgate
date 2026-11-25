export const SCHEMA_VERSION = 1;

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'ANY'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

/** Only "mock" exists in the MVP. More types (e.g. "modify") come later. */
export type RuleType = 'mock';

export interface Rule {
  id: string;
  label: string;
  enabled: boolean;
  type: RuleType;
  match: { method: HttpMethod; url: string; isRegex: boolean };
  response: { status: number; delayMs: number; headers: Record<string, string>; body: string };
  notes: string;
}

/** What the page script needs. Label and notes are deliberately NOT sent to the page. */
export type PageRule = Pick<Rule, 'id' | 'enabled' | 'match' | 'response'>;

export interface Settings {
  language: 'auto' | 'en' | 'es';
  theme: 'dark' | 'light';
}

export interface Store {
  schema: number;
  enabled: boolean;
  rules: Rule[];
  settings: Settings;
}

/** Number of times each rule answered a request. Kept apart from the rules so counting never rewrites them. */
export type Stats = Record<string, number>;
