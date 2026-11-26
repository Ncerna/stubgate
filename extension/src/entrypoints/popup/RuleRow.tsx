import { useState } from 'react';
import { HTTP_METHODS, checkJson, jsonErrorLine, parseCurl, statusText, validateRule, type HttpMethod, type Rule } from '../../core';
import { Icon } from '../../ui/icons';
import { useT, type Dict } from '../../ui/i18n';
import { CodeEditor } from './CodeEditor';

export function displayName(r: Rule, t: Dict): { text: string; muted: boolean } {
  if (r.label) return { text: r.label, muted: false };
  if (!r.match.url.trim()) return { text: t.newRuleName, muted: true };
  if (!r.match.isRegex) {
    try {
      const u = new URL(r.match.url);
      return { text: u.pathname + u.search || u.host, muted: true };
    } catch { /* not a full URL: show it as typed */ }
  }
  return { text: r.match.url, muted: true };
}

interface Props {
  rule: Rule;
  hits: number;
  expanded: boolean;
  menuOpen: boolean;
  onExpand(): void;
  onChange(r: Rule): void;
  onOpenMenu(rect: DOMRect): void;
  onToast(msg: string): void;
}

export function RuleRow({ rule, hits, expanded, menuOpen, onExpand, onChange, onOpenMenu, onToast }: Props) {
  const t = useT();
  const errors = validateRule(rule);
  const draft = rule.match.url.trim() === '';
  const name = displayName(rule, t);
  const s = rule.response.status;
  const set = (patch: Partial<Rule>) => onChange({ ...rule, ...patch });
  const setMatch = (patch: Partial<Rule['match']>) => onChange({ ...rule, match: { ...rule.match, ...patch } });

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const curl = parseCurl(e.clipboardData.getData('text'));
    if (!curl) return;
    e.preventDefault();
    setMatch({ url: curl.url, method: curl.method });
  };

  return (
    <div className={`rule-wrap ${expanded ? 'open' : ''}`}>
      <div className={`rule ${rule.enabled ? '' : 'off'}`}>
        <button className="chev" aria-expanded={expanded} aria-label={expanded ? t.collapseRule : t.expand} title={expanded ? t.collapseRule : t.expand} onClick={onExpand}>
          <Icon name={expanded ? 'chev-d' : 'chev-r'} />
        </button>
        <div className="main">
          <div className="meta">
            <span className={`name ${name.muted ? 'muted' : ''}`}>{name.text}</span>
            {draft ? (
              <span className="chip draft">{t.draft}</span>
            ) : (
              <>
                <span className={`chip ${Number.isNaN(s) ? '' : s >= 400 ? 'err' : s < 300 ? 'ok' : ''}`}>{Number.isNaN(s) ? '—' : s}</span>
                {rule.response.delayMs > 0 && (
                  <span className="chip"><Icon name="clock" small />{rule.response.delayMs} ms</span>
                )}
                {errors.length > 0 && <span className="chip err" title={t.invalidTitle}>{t.invalid}</span>}
              </>
            )}
          </div>
          <div className={`urlbox ${errors.some((e) => e.field === 'url') && !draft ? 'bad' : ''}`}>
            <input
              value={rule.match.url}
              placeholder={t.urlPh}
              spellCheck={false}
              aria-label={t.urlPh}
              autoFocus={draft && expanded}
              onChange={(e) => setMatch({ url: e.target.value })}
              onPaste={onPaste}
            />
            <button className={`regex ${rule.match.isRegex ? 'on' : ''}`} aria-pressed={rule.match.isRegex} title={t.regexToggle} aria-label={t.regexToggle} onClick={() => setMatch({ isRegex: !rule.match.isRegex })}>.*</button>
          </div>
        </div>
        <div className="right">
          <span className={`method ${rule.match.method}`}>{rule.match.method}</span>
          <span className={`hits ${hits > 0 ? 'hot' : ''}`} title={t.hitsTitle(hits)}>{hits}</span>
          <button className="toggle" role="switch" aria-checked={rule.enabled} aria-label={t.enabled} onClick={() => set({ enabled: !rule.enabled })} />
          <button className={`kebab ${menuOpen ? 'open' : ''}`} aria-label={t.ruleMenu} aria-haspopup="menu" aria-expanded={menuOpen} onClick={(e) => onOpenMenu(e.currentTarget.getBoundingClientRect())}>
            <Icon name="more" />
          </button>
        </div>
      </div>
      {expanded && <Editor rule={rule} errors={errors} draft={draft} onChange={onChange} onToast={onToast} />}
    </div>
  );
}

function Editor({ rule, errors, draft, onChange, onToast }: { rule: Rule; errors: ReturnType<typeof validateRule>; draft: boolean; onChange(r: Rule): void; onToast(m: string): void }) {
  const t = useT();
  const [tab, setTab] = useState<'body' | 'headers' | 'notes'>('body');
  const setResp = (patch: Partial<Rule['response']>) => onChange({ ...rule, response: { ...rule.response, ...patch } });
  const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));
  const has = (f: string) => errors.some((e) => e.field === f);

  const headers = Object.entries(rule.response.headers);
  const setHeaders = (list: [string, string][]) => setResp({ headers: Object.fromEntries(list) });
  const headerCount = headers.filter(([k, v]) => k !== '' || v !== '').length;

  const json = checkJson(rule.response.body);
  const badLine = json === 'invalid' ? jsonErrorLine(rule.response.body) : null;
  const reformat = (indent: number | undefined) => {
    try {
      setResp({ body: JSON.stringify(JSON.parse(rule.response.body), null, indent) });
    } catch { /* not valid JSON: leave it as it is */ }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rule.response.body);
      onToast(t.copied);
    } catch { /* clipboard not available */ }
  };
  const shown = errors.filter((e) => !(draft && e.code === 'urlRequired'));

  return (
    <div className="editor">
      <div className="fields">
        <div className="field">
          <label htmlFor={`m-${rule.id}`}>{t.httpMethod}</label>
          <div className="select">
            <select id={`m-${rule.id}`} value={rule.match.method} onChange={(e) => onChange({ ...rule, match: { ...rule.match, method: e.target.value as HttpMethod } })}>
              {HTTP_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <Icon name="chev-d" />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`s-${rule.id}`}>{t.statusCode}</label>
          <div className={`input ${has('status') ? 'bad' : ''}`}>
            <input id={`s-${rule.id}`} type="number" list="status-codes" min={200} max={599} value={Number.isNaN(rule.response.status) ? '' : rule.response.status} onChange={(e) => setResp({ status: num(e.target.value) })} />
            <span className="hint">{statusText(rule.response.status)}</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`d-${rule.id}`}>{t.delayBy}</label>
          <div className={`input ${has('delay') ? 'bad' : ''}`}>
            <input id={`d-${rule.id}`} type="number" min={0} max={60000} step={50} value={Number.isNaN(rule.response.delayMs) ? '' : rule.response.delayMs} onChange={(e) => setResp({ delayMs: num(e.target.value) })} />
            <span className="hint">ms</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`l-${rule.id}`}>{t.label}</label>
          <div className="input">
            <input id={`l-${rule.id}`} placeholder={t.labelPh} value={rule.label} onChange={(e) => onChange({ ...rule, label: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`t-${rule.id}`}>{t.ruleType}</label>
          <div className="select mock">
            <select id={`t-${rule.id}`} value="mock" onChange={() => {}}>
              <option value="mock">{t.typeMock}</option>
            </select>
            <Icon name="chev-d" />
          </div>
        </div>
      </div>
      <datalist id="status-codes">
        {[200, 201, 204, 400, 401, 403, 404, 429, 500, 503].map((c) => <option key={c} value={c}>{statusText(c)}</option>)}
      </datalist>

      {shown.length > 0 && <div className="errors" role="alert">{shown.map((e) => <div key={e.code}>⚠ {t.errors[e.code]}</div>)}</div>}

      <div className="etabs">
        <div className="tl" role="tablist">
          <button role="tab" aria-selected={tab === 'body'} className={`t ${tab === 'body' ? 'active' : ''}`} onClick={() => setTab('body')}>{t.tabBody}</button>
          <button role="tab" aria-selected={tab === 'headers'} className={`t ${tab === 'headers' ? 'active' : ''}`} onClick={() => setTab('headers')}>{t.tabHeaders}<span className="count">{headerCount}</span></button>
          <button role="tab" aria-selected={tab === 'notes'} className={`t ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>{t.tabNotes}</button>
        </div>
        {tab === 'body' && (
          <div className="tools">
            <button className="ibtn" title={t.formatJson} aria-label={t.formatJson} disabled={json !== 'valid'} onClick={() => reformat(2)}><Icon name="format" /></button>
            <button className="ibtn" title={t.compactJson} aria-label={t.compactJson} disabled={json !== 'valid'} onClick={() => reformat(undefined)}><Icon name="collapse" /></button>
            <button className="ibtn" title={t.copy} aria-label={t.copy} onClick={copy}><Icon name="copy" /></button>
          </div>
        )}
      </div>

      {tab === 'body' && (
        <div className="code">
          <CodeEditor value={rule.response.body} onChange={(body) => setResp({ body })} label={t.tabBody} />
          <div className="code-foot">
            {json === 'valid' && <span className="valid"><Icon name="check" small />{t.validJson}</span>}
            {json === 'invalid' && <span className="valid bad"><Icon name="warn" small />{badLine ? t.invalidJsonLine(badLine) : t.invalidJson}</span>}
            {json === 'empty' && <span className="valid empty">{t.emptyBody}</span>}
            <span>{t.saved}</span>
          </div>
        </div>
      )}
      {tab === 'headers' && (
        <div className="panel-box">
          {headers.map(([k, v], i) => (
            <div className="hrow" key={i}>
              <input aria-label={t.headerName} placeholder={t.headerName} value={k} spellCheck={false} onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [e.target.value, h[1]] : h)))} />
              <input aria-label={t.headerValue} placeholder={t.headerValue} value={v} spellCheck={false} onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [h[0], e.target.value] : h)))} />
              <button className="ibtn" style={{ width: 28, height: 32 }} aria-label={t.removeHeader} title={t.removeHeader} onClick={() => setHeaders(headers.filter((_, j) => j !== i))}><Icon name="x" small /></button>
            </div>
          ))}
          <button className="btn small" onClick={() => setHeaders([...headers.filter(([k, v]) => k !== '' || v !== ''), ['', '']])}><Icon name="plus" small />{t.addHeader}</button>
        </div>
      )}
      {tab === 'notes' && (
        <div className="panel-box">
          <textarea className="notes-box" aria-label={t.tabNotes} placeholder={t.notesPh} value={rule.notes} onChange={(e) => onChange({ ...rule, notes: e.target.value })} />
        </div>
      )}
    </div>
  );
}
