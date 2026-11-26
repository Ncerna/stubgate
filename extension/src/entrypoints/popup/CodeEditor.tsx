import type { ReactNode } from 'react';

const TOKEN = /("(?:\\.|[^"\\\n])*")(\s*:)?|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g;

/** Colours JSON-like text. Anything that is not JSON is shown as plain text, so a broken body still renders. */
export function highlight(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push(<span key={k++} className="tk">{m[1]}</span>);
        out.push(<span key={k++} className="tp">{m[2]}</span>);
      } else out.push(<span key={k++} className="ts">{m[1]}</span>);
    } else if (m[3] !== undefined) out.push(<span key={k++} className="tn">{m[3]}</span>);
    else out.push(<span key={k++} className="tp">{m[4]}</span>);
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A textarea drawn over a highlighted copy of its own text, with a line-number gutter. */
export function CodeEditor({ value, onChange, label }: { value: string; onChange(v: string): void; label: string }) {
  const lines = value.split('\n').length;
  const gutter = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
  return (
    <div className="code-scroll">
      <div className="code-grid">
        <div className="gutter" aria-hidden="true">{gutter}</div>
        <div className="code-body">
          <pre aria-hidden="true">{highlight(value)}{'\n'}</pre>
          <textarea aria-label={label} value={value} spellCheck={false} wrap="off" onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
    </div>
  );
}
