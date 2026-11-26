import { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyImport, buildExport, deleteRules, duplicateRule, moveToBottom, moveToTop, newRule, parseImport,
  type ImportMode, type Rule, type Store,
} from '../../core';
import { saveStats } from '../../platform/storage';
import { Icon, type IconName } from '../../ui/icons';
import { I18nContext, dictionaries, resolveLanguage } from '../../ui/i18n';
import { useStore } from '../../ui/useStore';
import { Dialogs, type DialogState } from './Dialogs';
import { RuleRow, displayName } from './RuleRow';

type Menu = { kind: 'more' | 'delete' | 'rule'; id?: string; rect: DOMRect };
type View = 'list' | 'settings';

export function App() {
  const { store, stats, update } = useStore();
  const [view, setView] = useState<View>('list');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<Menu | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [pendingImport, setPendingImport] = useState<Rule[]>([]);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const lang = resolveLanguage(store?.settings.language ?? 'auto', navigator.language);
  const t = dictionaries[lang];
  const rules = store?.rules ?? [];

  useEffect(() => {
    document.documentElement.dataset.theme = store?.settings.theme ?? 'dark';
    document.documentElement.lang = lang;
  }, [store?.settings.theme, lang]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Rule menu shortcuts (screen 05): D delete, C duplicate, T move to top, B move to bottom.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setMenu(null);
      if (menu.kind !== 'rule' || !menu.id || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'd') ruleAction('delete', menu.id);
      else if (k === 'c') ruleAction('duplicate', menu.id);
      else if (k === 't') ruleAction('top', menu.id);
      else if (k === 'b') ruleAction('bottom', menu.id);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => `${r.label} ${r.match.url} ${r.match.method}`.toLowerCase().includes(q));
  }, [rules, query]);

  if (!store) return <div className="app" />;

  const setRules = (fn: (r: Rule[]) => Rule[]) => update((s) => ({ ...s, rules: fn(s.rules) }));
  const patch = (r: Rule) => setRules((rs) => rs.map((x) => (x.id === r.id ? r : x)));
  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.length - enabledCount;

  function ruleAction(kind: 'delete' | 'duplicate' | 'top' | 'bottom', id: string) {
    setMenu(null);
    if (kind === 'delete') {
      setRules((rs) => rs.filter((r) => r.id !== id));
      setExpanded((e) => (e === id ? null : e));
    } else if (kind === 'duplicate') setRules((rs) => duplicateRule(rs, id));
    else if (kind === 'top') setRules((rs) => moveToTop(rs, id));
    else setRules((rs) => moveToBottom(rs, id));
  }

  const createRule = () => {
    const r = newRule();
    setRules((rs) => [r, ...rs]);
    setExpanded(r.id);
    setSearchOpen(false);
    setQuery('');
    setView('list');
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0 }));
  };

  const doExport = () => {
    const { filename, json } = buildExport(rules);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setToast(t.exported(rules.length, filename));
  };

  const onFile = async (file: File) => {
    const parsed = parseImport(await file.text());
    if (!parsed.ok) return setDialog({ kind: 'importError' });
    setPendingImport(parsed.rules);
    setDialog({ kind: 'import', fileName: file.name, count: parsed.rules.length, mode: 'add' });
  };

  const confirm = async () => {
    const d = dialog;
    setDialog(null);
    if (!d) return;
    if (d.kind === 'import') {
      setRules((rs) => applyImport(rs, pendingImport, d.mode as ImportMode));
      setExpanded(null);
      setToast(t.imported(pendingImport.length));
      setPendingImport([]);
    } else if (d.kind === 'clear') {
      await saveStats({});
      setToast(t.cacheCleared);
    } else if (d.kind === 'delete') {
      setRules((rs) => deleteRules(rs, d.scope));
      setExpanded(null);
    }
  };

  const globalOn = store.enabled;
  const pos = (rect: DOMRect, height: number) => {
    const flip = rect.bottom + height + 8 > 600;
    return { right: Math.max(8, 800 - rect.right), ...(flip ? { bottom: 600 - rect.top + 4 } : { top: rect.bottom + 4 }) };
  };
  const openMenu = (kind: Menu['kind'], rect: DOMRect, id?: string) => setMenu(menu?.kind === kind && menu.id === id ? null : { kind, rect, id });

  const MenuItem = ({ icon, label, kbd, danger, disabled, onClick }: { icon: IconName; label: string; kbd?: string; danger?: boolean; disabled?: boolean; onClick(): void }) => (
    <button role="menuitem" className={`mi ${danger ? 'danger' : ''}`} disabled={disabled} onClick={onClick}>
      <Icon name={icon} /><span>{label}</span>{kbd && <span className="kbd">{kbd}</span>}
    </button>
  );

  return (
    <I18nContext.Provider value={t}>
      <div className="app">
        {view === 'settings' ? (
          <>
            <header className="toolbar">
              <div className="tb-left">
                <button className="ibtn" aria-label={t.back} title={t.back} onClick={() => setView('list')}><Icon name="back" /></button>
                <span className="brand">{t.settings}</span>
              </div>
            </header>
            <div className="settings">
              <div className="field">
                <label htmlFor="lang">{t.language}</label>
                <div className="select">
                  <select id="lang" value={store.settings.language} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, language: e.target.value as Store['settings']['language'] } }))}>
                    <option value="auto">{t.auto}</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                  <Icon name="chev-d" />
                </div>
              </div>
              <div className="field">
                <label>{t.theme}</label>
                <div className="seg">
                  {(['dark', 'light'] as const).map((th) => (
                    <button key={th} className="btn" aria-pressed={store.settings.theme === th} onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme: th } }))}>
                      {th === 'dark' ? t.themeDark : t.themeLight}
                    </button>
                  ))}
                </div>
              </div>
              <p className="hintp">{t.priorityHint}</p>
            </div>
            <footer className="author-footer">
              <span>Ing. Nimer Cerna</span>
              <button className="author-info" type="button" title={t.authorInfo} aria-label={t.authorInfo}><Icon name="info" small /></button>
            </footer>
          </>
        ) : (
          <>
            <header className="toolbar">
              <div className="tb-left">
                <button className="ibtn" disabled title={t.menu} aria-label={t.menu}><Icon name="menu" /></button>
                <span className="brand"><img src="/icons/48.png" alt="" />{t.appName}</span>
              </div>
              <div className="tb-right">
                <button className="ibtn" disabled title={t.record} aria-label={t.record}><Icon name="record" /></button>
                <button className={`ibtn ${searchOpen ? 'active' : ''}`} title={t.search} aria-label={t.search} aria-pressed={searchOpen} onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setQuery(''); }}><Icon name="search" /></button>
                <button className={`ibtn ${menu?.kind === 'delete' ? 'open' : ''}`} title={t.del} aria-label={t.del} aria-haspopup="menu" onClick={(e) => openMenu('delete', e.currentTarget.getBoundingClientRect())}><Icon name="trash" /></button>
                <span className="sep" />
                <button className={`ibtn ${globalOn ? 'on' : 'paused'}`} role="switch" aria-checked={globalOn} title={globalOn ? t.globalPause : t.globalResume} aria-label={globalOn ? t.globalPause : t.globalResume} onClick={() => update((s) => ({ ...s, enabled: !s.enabled }))}><Icon name="power" /></button>
                <button className="ibtn primary" title={t.newRule} aria-label={t.newRule} onClick={createRule}><Icon name="plus" /></button>
                <span className="sep" />
                <button className="ibtn" title={t.settings} aria-label={t.settings} onClick={() => { setMenu(null); setView('settings'); }}><Icon name="sliders" /></button>
                <button className={`ibtn ${menu?.kind === 'more' ? 'open' : ''}`} title={t.more} aria-label={t.more} aria-haspopup="menu" aria-expanded={menu?.kind === 'more'} onClick={(e) => openMenu('more', e.currentTarget.getBoundingClientRect())}><Icon name="more" /></button>
              </div>
            </header>
            {searchOpen && (
              <div className="searchbar">
                <Icon name="search" small />
                <input autoFocus type="search" value={query} placeholder={t.searchPh} aria-label={t.search} onChange={(e) => setQuery(e.target.value)} />
              </div>
            )}
            <div className="tabs"><div className="tab active"><span className="dot" />{t.tabRules}<span className="count">{rules.length}</span></div></div>
            {!globalOn && <div className="banner" role="status">{t.pausedBanner}</div>}
            <main className={`rules ${globalOn ? '' : 'dim'}`} ref={listRef}>
              {rules.length === 0 ? (
                <div className="empty">
                  <strong>{t.noRules}</strong>
                  <p>{t.noRulesHint}</p>
                  <button className="btn primary" onClick={createRule}><Icon name="plus" small />{t.newRule}</button>
                </div>
              ) : shown.length === 0 ? (
                <div className="empty"><p>{t.noResults}</p></div>
              ) : (
                shown.map((r) => (
                  <RuleRow
                    key={r.id}
                    rule={r}
                    hits={stats[r.id] ?? 0}
                    expanded={expanded === r.id}
                    menuOpen={menu?.kind === 'rule' && menu.id === r.id}
                    onExpand={() => setExpanded(expanded === r.id ? null : r.id)}
                    onChange={patch}
                    onOpenMenu={(rect) => openMenu('rule', rect, r.id)}
                    onToast={setToast}
                  />
                ))
              )}
            </main>
            <footer className="statusbar">
              <span className="l"><span className={`dot ${globalOn ? '' : 'off'}`} />{globalOn ? t.active : t.paused}</span>
              <span>{t.enabledCount(enabledCount, rules.length)}</span>
            </footer>
          </>
        )}

        {menu && <div className="backdrop" onMouseDown={() => setMenu(null)} />}
        {menu?.kind === 'more' && (
          <div className="menu" role="menu" style={pos(menu.rect, 120)}>
            <MenuItem icon="upload" label={t.importItem} onClick={() => { setMenu(null); fileRef.current?.click(); }} />
            <MenuItem icon="download" label={t.exportItem} onClick={() => { setMenu(null); doExport(); }} />
            <div className="msep" />
            <MenuItem icon="refresh" label={t.clearCache} onClick={() => { setMenu(null); setDialog({ kind: 'clear' }); }} />
          </div>
        )}
        {menu?.kind === 'delete' && (
          <div className="menu" role="menu" style={pos(menu.rect, 90)}>
            <MenuItem icon="trash" danger disabled={rules.length === 0} label={t.deleteAll} onClick={() => { setMenu(null); setDialog({ kind: 'delete', scope: 'all', count: rules.length }); }} />
            <MenuItem icon="trash" disabled={disabledCount === 0} label={t.deleteDisabled} onClick={() => { setMenu(null); setDialog({ kind: 'delete', scope: 'disabled', count: disabledCount }); }} />
          </div>
        )}
        {menu?.kind === 'rule' && menu.id && (
          <div className="menu" role="menu" style={{ ...pos(menu.rect, 150), minWidth: 200 }} aria-label={displayName(rules.find((r) => r.id === menu.id)!, t).text}>
            <MenuItem icon="trash" danger label={t.ruleDelete} kbd="D" onClick={() => ruleAction('delete', menu.id!)} />
            <div className="msep" />
            <MenuItem icon="copy" label={t.ruleDuplicate} kbd="C" onClick={() => ruleAction('duplicate', menu.id!)} />
            <MenuItem icon="to-top" label={t.ruleTop} kbd="T" disabled={rules[0]?.id === menu.id} onClick={() => ruleAction('top', menu.id!)} />
            <MenuItem icon="to-bottom" label={t.ruleBottom} kbd="B" disabled={rules[rules.length - 1]?.id === menu.id} onClick={() => ruleAction('bottom', menu.id!)} />
          </div>
        )}

        {dialog && (
          <Dialogs
            dialog={dialog}
            onMode={(mode) => setDialog((d) => (d && d.kind === 'import' ? { ...d, mode } : d))}
            onConfirm={confirm}
            onCancel={() => { setDialog(null); setPendingImport([]); }}
          />
        )}
        {toast && <div className="toast" role="status"><Icon name="check" small />{toast}</div>}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
      </div>
    </I18nContext.Provider>
  );
}
