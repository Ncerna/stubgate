import { useEffect, useMemo, useRef, useState } from 'react';
import { createId, migrate, newRule, validateRule, type Rule, type Store } from '../../core';
import { I18nContext, dictionaries, resolveLanguage } from '../../ui/i18n';
import { useStore } from '../../ui/useStore';
import { RuleEditor } from './RuleEditor';
import { RuleList } from './RuleList';

type View = { name: 'list' } | { name: 'edit'; id: string } | { name: 'settings' };

export function App() {
  const { store, stats, update } = useStore();
  const [view, setView] = useState<View>({ name: 'list' });
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const lang = resolveLanguage(store?.settings.language ?? 'auto', navigator.language);
  const t = dictionaries[lang];

  useEffect(() => {
    document.documentElement.dataset.theme = store?.settings.theme ?? 'dark';
    document.documentElement.lang = lang;
  }, [store?.settings.theme, lang]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const rules = store?.rules ?? [];
  const activeCount = useMemo(
    () => rules.filter((r) => r.enabled && validateRule(r).length === 0).length,
    [rules],
  );

  if (!store) return <div className="app" />;

  const setRules = (fn: (r: Rule[]) => Rule[]) => update((s) => ({ ...s, rules: fn(s.rules) }));
  const patchRule = (id: string, fn: (r: Rule) => Rule) => setRules((rs) => rs.map((r) => (r.id === id ? fn(r) : r)));

  const create = () => {
    const rule = newRule();
    setRules((rs) => [rule, ...rs]);
    setView({ name: 'edit', id: rule.id });
  };
  const duplicate = (id: string) =>
    setRules((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const src = rs[i];
      if (!src) return rs;
      const copy: Rule = { ...structuredClone(src), id: createId(), label: src.label ? `${src.label} (copy)` : '' };
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
  const move = (id: string, delta: -1 | 1) =>
    setRules((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const next = [...rs];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const exportRules = () => {
    const data = { app: 'stubgate', version: 1, rules: store.rules };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stubgate-rules.json';
    a.click();
    URL.revokeObjectURL(url);
    setToast(t.exported);
  };

  const importFile = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as { app?: unknown; rules?: unknown };
      if (raw.app !== 'stubgate' || !Array.isArray(raw.rules)) throw new Error('shape');
      // Same sanitising as for storage; new ids so an import never overwrites existing rules.
      const incoming = migrate({ rules: raw.rules }).rules.map((r) => ({ ...r, id: createId() }));
      setRules((rs) => [...incoming, ...rs]);
      setToast(t.imported(incoming.length));
    } catch {
      setToast(t.importFailed);
    }
  };

  const editing = view.name === 'edit' ? rules.find((r) => r.id === view.id) : undefined;

  return (
    <I18nContext.Provider value={t}>
      <div className="app">
        {(view.name === 'list' || (view.name === 'edit' && !editing)) && (
          <RuleList
            store={store}
            stats={stats}
            activeCount={activeCount}
            onToggleAll={() => update((s: Store) => ({ ...s, enabled: !s.enabled }))}
            onCreate={create}
            onEdit={(id) => setView({ name: 'edit', id })}
            onToggle={(id) => patchRule(id, (r) => ({ ...r, enabled: !r.enabled }))}
            onDuplicate={duplicate}
            onDelete={(id) => setRules((rs) => rs.filter((r) => r.id !== id))}
            onMove={move}
            onSettings={() => setView({ name: 'settings' })}
            onExport={exportRules}
            onImport={() => fileRef.current?.click()}
          />
        )}
        {view.name === 'edit' && editing && (
          <RuleEditor rule={editing} onChange={(r) => patchRule(editing.id, () => r)} onBack={() => setView({ name: 'list' })} />
        )}
        {view.name === 'settings' && (
          <div className="screen">
            <header className="bar">
              <button className="icon-btn" aria-label={t.back} onClick={() => setView({ name: 'list' })}>←</button>
              <h1>{t.settings}</h1>
            </header>
            <div className="form">
              <label className="field narrow">
                <span>{t.language}</span>
                <select
                  value={store.settings.language}
                  onChange={(e) =>
                    update((s) => ({ ...s, settings: { ...s.settings, language: e.target.value as Store['settings']['language'] } }))
                  }
                >
                  <option value="auto">{t.auto}</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <p className="hint">{t.priorityHint}</p>
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = '';
          }}
        />
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </I18nContext.Provider>
  );
}
