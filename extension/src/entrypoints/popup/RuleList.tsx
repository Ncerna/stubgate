import { useMemo, useState } from 'react';
import { validateRule, type Rule, type Stats, type Store } from '../../core';
import { useT } from '../../ui/i18n';

interface Props {
  store: Store;
  stats: Stats;
  activeCount: number;
  onToggleAll(): void;
  onCreate(): void;
  onEdit(id: string): void;
  onToggle(id: string): void;
  onDuplicate(id: string): void;
  onDelete(id: string): void;
  onMove(id: string, delta: -1 | 1): void;
  onSettings(): void;
  onExport(): void;
  onImport(): void;
}

export function RuleList(p: Props) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const { rules, enabled } = p.store;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter((r) => `${r.label} ${r.match.url} ${r.match.method}`.toLowerCase().includes(q));
  }, [rules, query]);

  return (
    <div className="screen">
      <header className="bar">
        <img src="/icons/48.png" alt="" className="logo" />
        <h1>{t.appName}</h1>
        <span className={`pill ${enabled ? 'on' : 'off'}`}>{enabled ? t.activeCount(p.activeCount, rules.length) : t.paused}</span>
        <div className="spacer" />
        <button className="switch" role="switch" aria-checked={enabled} aria-label={enabled ? t.pauseAll : t.resumeAll} title={enabled ? t.pauseAll : t.resumeAll} onClick={p.onToggleAll} />
        <button className="btn primary" onClick={p.onCreate}>+ {t.newRule}</button>
        <div className="menu-wrap">
          <button className="icon-btn" aria-label={t.menu} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button>
          {menu && (
            <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <button role="menuitem" onClick={() => { setMenu(false); p.onImport(); }}>{t.importRules}</button>
              <button role="menuitem" onClick={() => { setMenu(false); p.onExport(); }}>{t.exportRules}</button>
              <button role="menuitem" onClick={() => { setMenu(false); p.onSettings(); }}>{t.settings}</button>
            </div>
          )}
        </div>
      </header>

      <div className="toolbar">
        <input type="search" placeholder={t.search} aria-label={t.search} value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className={`list ${enabled ? '' : 'dim'}`}>
        {rules.length === 0 ? (
          <div className="empty">
            <strong>{t.noRules}</strong>
            <p>{t.noRulesHint}</p>
            <button className="btn primary" onClick={p.onCreate}>+ {t.newRule}</button>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty"><p>{t.noResults}</p></div>
        ) : (
          shown.map((r) => (
            <Row key={r.id} rule={r} hits={p.stats[r.id] ?? 0} first={rules[0]?.id === r.id} last={rules[rules.length - 1]?.id === r.id}
              confirming={confirm === r.id} onAskDelete={() => setConfirm(r.id)} onCancel={() => setConfirm(null)}
              {...p} />
          ))
        )}
      </div>
    </div>
  );
}

function Row({ rule, hits, first, last, confirming, onAskDelete, onCancel, onEdit, onToggle, onDuplicate, onDelete, onMove }:
  { rule: Rule; hits: number; first: boolean; last: boolean; confirming: boolean; onAskDelete(): void; onCancel(): void } & Pick<Props, 'onEdit' | 'onToggle' | 'onDuplicate' | 'onDelete' | 'onMove'>) {
  const t = useT();
  const invalid = validateRule(rule).length > 0;
  return (
    <div className={`row ${rule.enabled ? '' : 'disabled'}`}>
      <button className="switch" role="switch" aria-checked={rule.enabled} aria-label={t.enabled} onClick={() => onToggle(rule.id)} />
      <button className="row-main" onClick={() => onEdit(rule.id)}>
        <span className="row-top">
          <span className={`method m-${rule.match.method}`}>{rule.match.method}</span>
          <span className="row-name">{rule.label || t.untitled}</span>
          {invalid && <span className="warn" title={t.invalidRule}>⚠ {t.invalidRule}</span>}
        </span>
        <span className="row-url mono">{rule.match.url || '—'}</span>
        <span className="row-meta mono">
          {rule.match.isRegex && <span className="tag">regex</span>}
          <span className={`status s-${Math.floor(rule.response.status / 100)}`}>{rule.response.status}</span>
          {rule.response.delayMs > 0 && <span>{rule.response.delayMs} ms</span>}
          <span>{t.hits(hits)}</span>
        </span>
      </button>
      {confirming ? (
        <div className="confirm">
          <span>{t.confirmDelete}</span>
          <button className="btn danger" onClick={() => onDelete(rule.id)}>{t.yes}</button>
          <button className="btn" onClick={onCancel}>{t.cancel}</button>
        </div>
      ) : (
        <div className="row-actions">
          <button className="icon-btn" aria-label={t.moveUp} title={t.moveUp} disabled={first} onClick={() => onMove(rule.id, -1)}>↑</button>
          <button className="icon-btn" aria-label={t.moveDown} title={t.moveDown} disabled={last} onClick={() => onMove(rule.id, 1)}>↓</button>
          <button className="icon-btn" aria-label={t.duplicate} title={t.duplicate} onClick={() => onDuplicate(rule.id)}>⧉</button>
          <button className="icon-btn" aria-label={t.delete} title={t.delete} onClick={onAskDelete}>🗑</button>
        </div>
      )}
    </div>
  );
}
