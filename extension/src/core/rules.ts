import { createId } from './defaults';
import type { Rule } from './types';

/** A copy goes right below the original, ends in "copy" and starts disabled, so two equal rules never apply at once. */
export function duplicateRule(rules: Rule[], id: string): Rule[] {
  const i = rules.findIndex((r) => r.id === id);
  const src = rules[i];
  if (!src) return rules;
  const copy: Rule = { ...structuredClone(src), id: createId(), enabled: false, label: src.label ? `${src.label} copy` : '' };
  return [...rules.slice(0, i + 1), copy, ...rules.slice(i + 1)];
}

export function moveToTop(rules: Rule[], id: string): Rule[] {
  const i = rules.findIndex((r) => r.id === id);
  if (i <= 0) return rules;
  return [rules[i]!, ...rules.slice(0, i), ...rules.slice(i + 1)];
}

export function moveToBottom(rules: Rule[], id: string): Rule[] {
  const i = rules.findIndex((r) => r.id === id);
  if (i < 0 || i === rules.length - 1) return rules;
  return [...rules.slice(0, i), ...rules.slice(i + 1), rules[i]!];
}

export type DeleteScope = 'all' | 'disabled';

export function deleteRules(rules: Rule[], scope: DeleteScope): Rule[] {
  return scope === 'all' ? [] : rules.filter((r) => r.enabled);
}
