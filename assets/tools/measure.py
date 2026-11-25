#!/usr/bin/env python3
"""Injects a measuring script into copies of the rendered screens and prints element sizes."""
import json
import pathlib
import re
import subprocess

SRC = pathlib.Path(__file__).resolve().parent.parent / 'ui' / 'src'
TMP = pathlib.Path('/tmp/claude-0/-home-claude/38a0b9ea-fe1e-5d80-a5a2-cb750dffec40/scratchpad/measure')
TMP.mkdir(parents=True, exist_ok=True)

JS = """<script>
const sels=['.toolbar','.tabs','.tab','.rules','.rule','.ibtn','.ibtn.primary','.sep','.brand','.method','.toggle','.urlbox','.regex','.kebab','.hits','.chev','.chip','.statusbar',
'.body3','.fields','.field','.input','.select','.etabs','.etabs .t','.code','.code-foot','.mi','.menu','.msep','.btn','.dlg','.toast'];
const out={};
for(const s of sels){const e=document.querySelector(s); if(!e) continue; const r=e.getBoundingClientRect();
 out[s]=[+r.width.toFixed(1),+r.height.toFixed(1),+r.left.toFixed(1),+r.top.toFixed(1)];}
const f=[...document.querySelectorAll('.fields .field')].map(e=>+e.getBoundingClientRect().width.toFixed(1));
out['fieldWidths']=f;
const rr=[...document.querySelectorAll('.rule')].map(e=>+e.getBoundingClientRect().height.toFixed(1));
out['ruleHeights']=rr;
const cl=document.querySelector('.right'); if(cl){const r=cl.getBoundingClientRect(); out['.right']=[+r.width.toFixed(1),+r.height.toFixed(1),+r.left.toFixed(1),+r.top.toFixed(1)];}
const mn=document.querySelector('.rule .main'); if(mn){const r=mn.getBoundingClientRect(); out['.rule .main']=[+r.width.toFixed(1),+r.height.toFixed(1),+r.left.toFixed(1),+r.top.toFixed(1)];}
document.body.insertAdjacentHTML('beforeend','<pre id="m">'+JSON.stringify(out)+'</pre>');
</script>"""

for name in ['01-rules-panel', '03-new-rule', '05-rule-menu', '04-more-menu']:
    html = (SRC / f'{name}.html').read_text(encoding='utf-8').replace('</body>', JS + '</body>')
    p = TMP / f'{name}.html'
    p.write_text(html, encoding='utf-8')
    res = subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu',
                          '--window-size=800,600', '--virtual-time-budget=2000', '--dump-dom',
                          f'file://{p}'], capture_output=True, text=True)
    m = re.search(r'<pre id="m">(\{.*?\})</pre>', res.stdout, re.S)
    print('=====', name)
    if m:
        data = json.loads(m.group(1).replace('&quot;', '"'))
        for k, v in data.items():
            print(f'{k:16} {v}')
    else:
        print('no data', res.stderr[-300:])
