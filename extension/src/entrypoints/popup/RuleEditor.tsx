import { HTTP_METHODS, checkJson, statusText, validateRule, type HttpMethod, type Rule } from '../../core';
import { useT } from '../../ui/i18n';

export function RuleEditor({ rule, onChange, onBack }: { rule: Rule; onChange(r: Rule): void; onBack(): void }) {
  const t = useT();
  const errors = validateRule(rule);
  const err = (field: string) => errors.filter((e) => e.field === field).map((e) => t.errors[e.code]);
  const set = (patch: Partial<Rule>) => onChange({ ...rule, ...patch });
  const setMatch = (patch: Partial<Rule['match']>) => onChange({ ...rule, match: { ...rule.match, ...patch } });
  const setResp = (patch: Partial<Rule['response']>) => onChange({ ...rule, response: { ...rule.response, ...patch } });

  const headers = Object.entries(rule.response.headers);
  const setHeaders = (list: [string, string][]) => setResp({ headers: Object.fromEntries(list) });
  const jsonState = checkJson(rule.response.body);

  const format = () => {
    try {
      setResp({ body: JSON.stringify(JSON.parse(rule.response.body), null, 2) });
    } catch { /* not JSON: leave as is */ }
  };

  const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

  return (
    <div className="screen">
      <header className="bar">
        <button className="icon-btn" aria-label={t.back} onClick={onBack}>←</button>
        <h1>{rule.label || t.untitled}</h1>
        <div className="spacer" />
        <span className="saved">✓ {t.saved}</span>
        <button className="switch" role="switch" aria-checked={rule.enabled} aria-label={t.enabled} onClick={() => set({ enabled: !rule.enabled })} />
      </header>

      <div className="form scroll">
        <div className="grid">
          <label className="field wide">
            <span>{t.label}</span>
            <input value={rule.label} placeholder={t.labelPh} onChange={(e) => set({ label: e.target.value })} />
          </label>
          <label className="field">
            <span>{t.method}</span>
            <select value={rule.match.method} onChange={(e) => setMatch({ method: e.target.value as HttpMethod })}>
              {HTTP_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="field url">
            <span>{t.url}</span>
            <input className="mono" value={rule.match.url} placeholder={t.urlPh} spellCheck={false} aria-invalid={err('url').length > 0}
              onChange={(e) => setMatch({ url: e.target.value })} autoFocus={!rule.match.url} />
          </label>
          <label className="field check">
            <span>{t.regex}</span>
            <input type="checkbox" checked={rule.match.isRegex} onChange={(e) => setMatch({ isRegex: e.target.checked })} />
          </label>
          <Errors list={err('url')} />
          <label className="field">
            <span>{t.status}</span>
            <input className="mono" type="number" min={200} max={599} value={Number.isNaN(rule.response.status) ? '' : rule.response.status}
              aria-invalid={err('status').length > 0} onChange={(e) => setResp({ status: num(e.target.value) })} />
            <small>{statusText(rule.response.status)}</small>
          </label>
          <label className="field">
            <span>{t.delay}</span>
            <input className="mono" type="number" min={0} max={60000} step={50} value={Number.isNaN(rule.response.delayMs) ? '' : rule.response.delayMs}
              aria-invalid={err('delay').length > 0} onChange={(e) => setResp({ delayMs: num(e.target.value) })} />
          </label>
          <Errors list={[...err('status'), ...err('delay')]} />
        </div>

        <div className="field">
          <span className="row-line">
            {t.body}
            <span className={`json ${jsonState}`}>{t.json[jsonState]}</span>
            <button className="btn small" onClick={format} disabled={jsonState !== 'valid'}>{t.format}</button>
          </span>
          <textarea className="mono body" spellCheck={false} value={rule.response.body} onChange={(e) => setResp({ body: e.target.value })} />
        </div>

        <div className="field">
          <span className="row-line">{t.headers}</span>
          {headers.map(([k, v], i) => (
            <div className="header-row" key={i}>
              <input className="mono" aria-label={t.headerName} placeholder={t.headerName} value={k} spellCheck={false}
                onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [e.target.value, h[1]] : h)))} />
              <input className="mono" aria-label={t.headerValue} placeholder={t.headerValue} value={v} spellCheck={false}
                onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [h[0], e.target.value] : h)))} />
              <button className="icon-btn" aria-label={t.removeHeader} title={t.removeHeader} onClick={() => setHeaders(headers.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <Errors list={err('headers')} />
          <button className="btn small" onClick={() => setHeaders([...headers.filter(([k]) => k !== ''), ['', '']])}>+ {t.addHeader}</button>
        </div>

        <label className="field">
          <span>{t.notes}</span>
          <textarea className="notes" placeholder={t.notesPh} value={rule.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

function Errors({ list }: { list: string[] }) {
  if (list.length === 0) return null;
  return <div className="errors wide" role="alert">{list.map((m) => <div key={m}>⚠ {m}</div>)}</div>;
}
