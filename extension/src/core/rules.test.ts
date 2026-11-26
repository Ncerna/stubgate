import { describe, expect, it } from 'vitest';
import { newRule } from './defaults';
import { deleteRules, duplicateRule, moveToBottom, moveToTop } from './rules';

const mk = (label: string, enabled = true) => newRule({ label, enabled });
const labels = (rs: { label: string }[]) => rs.map((r) => r.label);

describe('rule list operations', () => {
  it('duplicates below the original, disabled, named "… copy", with a new id', () => {
    const [a, b] = [mk('a'), mk('b')];
    const out = duplicateRule([a, b], a.id);
    expect(labels(out)).toEqual(['a', 'a copy', 'b']);
    expect(out[1]!.enabled).toBe(false);
    expect(out[1]!.id).not.toBe(a.id);
    expect(out[1]!.response).toEqual(a.response);
    out[1]!.response.headers['X'] = '1';
    expect(a.response.headers['X']).toBeUndefined(); // deep copy
  });
  it('duplicating an unnamed rule keeps it unnamed', () => {
    const a = mk('');
    expect(duplicateRule([a], a.id)[1]!.label).toBe('');
  });
  it('moves to top and to bottom, and leaves the list alone at the ends', () => {
    const [a, b, c] = [mk('a'), mk('b'), mk('c')];
    expect(labels(moveToTop([a, b, c], c.id))).toEqual(['c', 'a', 'b']);
    expect(labels(moveToBottom([a, b, c], a.id))).toEqual(['b', 'c', 'a']);
    const list = [a, b, c];
    expect(moveToTop(list, a.id)).toBe(list);
    expect(moveToBottom(list, c.id)).toBe(list);
    expect(moveToTop(list, 'nope')).toBe(list);
  });
  it('deletes all, or only the disabled ones', () => {
    const list = [mk('on'), mk('off', false), mk('off2', false)];
    expect(deleteRules(list, 'all')).toEqual([]);
    expect(labels(deleteRules(list, 'disabled'))).toEqual(['on']);
  });
});
