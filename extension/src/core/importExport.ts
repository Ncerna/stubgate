import { createId } from './defaults';
import { migrate } from './migrate';
import type { Rule } from './types';

export const EXPORT_APP = 'stubgate';
export type ImportMode = 'add' | 'replace';

export function exportFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `stubgate-rules-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

export function buildExport(rules: Rule[], now: Date = new Date()): { filename: string; json: string } {
  const data = { app: EXPORT_APP, version: 1, exportedAt: now.toISOString(), rules };
  return { filename: exportFilename(now), json: JSON.stringify(data, null, 2) };
}

export type ParsedImport = { ok: true; rules: Rule[] } | { ok: false };

/** Reads an export file. Rules are sanitised like stored data, so a bad file can never put bad data in. */
export function parseImport(text: string): ParsedImport {
  try {
    const raw = JSON.parse(text) as { app?: unknown; rules?: unknown };
    if (raw?.app !== EXPORT_APP || !Array.isArray(raw.rules)) return { ok: false };
    return { ok: true, rules: migrate({ rules: raw.rules }).rules };
  } catch {
    return { ok: false };
  }
}

/** Imported rules always get new ids. In "add" mode, a name that already exists is renamed "name (2)", "name (3)"… */
export function applyImport(existing: Rule[], incoming: Rule[], mode: ImportMode): Rule[] {
  const taken = new Set(mode === 'add' ? existing.map((r) => r.label).filter(Boolean) : []);
  const fresh = incoming.map((r) => {
    let label = r.label;
    if (label && taken.has(label)) {
      let n = 2;
      while (taken.has(`${r.label} (${n})`)) n++;
      label = `${r.label} (${n})`;
    }
    if (label) taken.add(label);
    return { ...r, id: createId(), label };
  });
  return mode === 'replace' ? fresh : [...fresh, ...existing];
}
