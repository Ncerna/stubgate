#!/usr/bin/env python3
"""Screen 07 (panel inside a browser window) and screen 08 (dimension blueprint)."""
import pathlib
import subprocess

DESIGN = pathlib.Path(__file__).resolve().parent.parent
UI = DESIGN / 'ui'
SRC = UI / 'src'
STORE = DESIGN / 'store'
STORE.mkdir(parents=True, exist_ok=True)

MARK = ('<svg viewBox="0 0 128 128" width="22" height="22" aria-hidden="true">'
        '<rect x="2" y="2" width="124" height="124" rx="24" fill="#111827" stroke="#27344F" stroke-width="4"/>'
        '<circle cx="24" cy="64" r="14" fill="#fff"/><path d="M38 64H50" stroke="#fff" stroke-width="10"/>'
        '<path d="M78 64H90" stroke="#2DD4BF" stroke-width="10"/>'
        '<rect x="46" y="46" width="36" height="36" rx="5" transform="rotate(45 64 64)" fill="#2DD4BF"/>'
        '<circle cx="104" cy="64" r="14" fill="#2DD4BF"/></svg>')


def icon(path, size=18):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{path}</svg>')


# ------------------------------------------------------------------ screen 07
CSS07 = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:800px;overflow:hidden}
body{font:13px/1.4 Inter,'Segoe UI',system-ui,sans-serif;background:#0F1419;color:#E5E7EB;position:relative;-webkit-font-smoothing:antialiased}
.tabstrip{height:40px;background:#0A0E13;display:flex;align-items:flex-end;padding:0 12px;gap:4px}
.tab{height:32px;width:230px;border-radius:9px 9px 0 0;background:#1B2230;display:flex;align-items:center;gap:8px;padding:0 12px;font-size:12px}
.tab.dim{background:transparent;color:#64748B;width:170px}
.fav{width:14px;height:14px;border-radius:4px;background:#60A5FA;flex:none}
.fav.g{background:#475569}
.bar{height:48px;background:#1B2230;display:flex;align-items:center;gap:8px;padding:0 12px}
.nav{width:30px;height:30px;display:grid;place-items:center;color:#94A3B8}
.omni{flex:1;height:32px;border-radius:16px;background:#0F1419;display:flex;align-items:center;gap:8px;padding:0 14px;color:#64748B;font-size:13px}
.omni b{color:#E5E7EB;font-weight:500}
.ext{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;flex:none}
.ext.other i{display:block;width:16px;height:16px;border-radius:5px;background:#475569}
.ext.me{background:rgba(45,212,191,.16);box-shadow:0 0 0 2px rgba(45,212,191,.55)}
.avatar{width:28px;height:28px;border-radius:50%;background:#475569;flex:none}
.page{position:absolute;top:88px;left:0;right:0;bottom:0;background:#EEF1F5;display:flex;color:#111827}
.side{width:220px;background:#fff;padding:22px 18px;display:flex;flex-direction:column;gap:12px;border-right:1px solid #E2E8F0}
.sk{background:#E2E8F0;border-radius:6px;height:12px}
.sk.d{background:#CBD5E1}
.main{flex:1;padding:26px 30px;display:flex;flex-direction:column;gap:20px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:#fff;border-radius:12px;padding:16px;height:96px;display:flex;flex-direction:column;gap:12px;border:1px solid #E2E8F0}
.table{background:#fff;border-radius:12px;border:1px solid #E2E8F0;padding:16px;display:flex;flex-direction:column;gap:16px;flex:1}
.scrim{position:absolute;top:88px;left:0;right:0;bottom:0;background:rgba(11,18,32,.34)}
.pop{position:absolute;left:410px;top:90px;width:800px;height:600px;border-radius:12px;overflow:hidden;
box-shadow:0 26px 64px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.1)}
.pop iframe{width:800px;height:600px;border:0;display:block}
"""


def screen07():
    side = ''.join(f'<div class="sk {"d" if i == 0 else ""}" style="width:{w}%"></div>'
                   for i, w in enumerate([70, 55, 62, 48, 58, 40]))
    cards = ''.join('<div class="card"><div class="sk" style="width:40%"></div>'
                    '<div class="sk d" style="width:60%;height:22px"></div></div>' for _ in range(3))
    rows = ''.join('<div style="display:flex;gap:20px"><div class="sk" style="width:22%"></div>'
                   '<div class="sk" style="width:34%"></div><div class="sk" style="width:14%"></div></div>'
                   for _ in range(7))
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>Stubgate in browser</title><style>{CSS07}</style></head><body>
<div class="tabstrip">
  <div class="tab"><span class="fav"></span><span>Dashboard · app.ejemplo.com</span></div>
  <div class="tab dim"><span class="fav g"></span><span>New tab</span></div>
</div>
<div class="bar">
  <span class="nav">{icon('<path d="m15 6-6 6 6 6"/>')}</span>
  <span class="nav">{icon('<path d="m9 6 6 6-6 6"/>')}</span>
  <span class="nav">{icon('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5V9H15"/>')}</span>
  <div class="omni">{icon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 14)}<b>app.ejemplo.com</b>/dashboard</div>
  <span class="ext other"><i></i></span>
  <span class="ext me">{MARK}</span>
  <span class="avatar"></span>
  <span class="nav">{icon('<circle cx="12" cy="5.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="18.5" r="1.4" fill="currentColor"/>')}</span>
</div>
<div class="page">
  <div class="side">{side}</div>
  <div class="main"><div class="sk d" style="width:260px;height:20px"></div><div class="cards">{cards}</div><div class="table">{rows}</div></div>
</div>
<div class="scrim"></div>
<div class="pop"><iframe src="01-rules-panel.html" scrolling="no"></iframe></div>
</body></html>'''


# ------------------------------------------------------------------ screen 08
PX, PY = 170, 110     # popup origin on the blueprint canvas
TEAL, AMBER, BG = '#2DD4BF', '#FBBF24', '#0B1220'


def tick_h(x, y, w=6):
    return f'<line x1="{x - w}" y1="{y}" x2="{x + w}" y2="{y}" stroke="{TEAL}" stroke-width="1.5"/>'


def tick_v(x, y, w=6):
    return f'<line x1="{x}" y1="{y - w}" x2="{x}" y2="{y + w}" stroke="{TEAL}" stroke-width="1.5"/>'


def label_box(cx, cy, text, rot=False):
    t = f'transform="rotate(-90 {cx} {cy})"' if rot else ''
    return (f'<g {t}><rect x="{cx - 34}" y="{cy - 11}" width="68" height="22" rx="5" fill="{BG}"/>'
            f'<text x="{cx}" y="{cy + 4.5}" text-anchor="middle" font-family="JetBrains Mono,DejaVu Sans Mono,monospace" '
            f'font-size="13" font-weight="700" fill="{TEAL}">{text}</text></g>')


ZONES = [(0, 52, '52 px', 'Toolbar'), (52, 90, '38 px', 'Tabs'),
         (90, 568, '478 px', 'Rule list · 6 rows of 76 px'), (568, 600, '32 px', 'Status bar')]
# (letter, x, y, w, h, badge position) in popup coordinates, measured from the rendered screen 01
ELEMS = [('A', 10, 8.5, 34, 34), ('B', 42, 122.9, 564, 32), ('C', 612, 116, 58, 23),
         ('D', 716, 117.5, 34, 20), ('E', 762, 115.5, 24, 24)]


def screen08():
    svg = []
    # overall width and height cotas
    svg.append(f'<line x1="{PX}" y1="{PY - 20}" x2="{PX + 800}" y2="{PY - 20}" stroke="{TEAL}" stroke-width="1.5"/>')
    svg += [tick_v(PX, PY - 20), tick_v(PX + 800, PY - 20)]
    svg.append(label_box(PX + 400, PY - 20, '800 px'))
    svg.append(f'<line x1="{PX - 30}" y1="{PY}" x2="{PX - 30}" y2="{PY + 600}" stroke="{TEAL}" stroke-width="1.5"/>')
    svg += [tick_h(PX - 30, PY), tick_h(PX - 30, PY + 600)]
    svg.append(label_box(PX - 30, PY + 300, '600 px', rot=True))
    # zone cotas on the right
    cx = PX + 800 + 28
    for y0, y1, val, name in ZONES:
        a, b = PY + y0, PY + y1
        svg.append(f'<line x1="{PX + 800}" y1="{a}" x2="{cx + 8}" y2="{a}" stroke="{TEAL}" stroke-opacity=".35" stroke-dasharray="3 4"/>')
        svg.append(f'<line x1="{PX + 800}" y1="{b}" x2="{cx + 8}" y2="{b}" stroke="{TEAL}" stroke-opacity=".35" stroke-dasharray="3 4"/>')
        svg.append(f'<line x1="{cx}" y1="{a}" x2="{cx}" y2="{b}" stroke="{TEAL}" stroke-width="1.5"/>')
        svg += [tick_h(cx, a, 5), tick_h(cx, b, 5)]
        mid = (a + b) / 2
        svg.append(f'<text x="{cx + 16}" y="{mid - 1}" font-family="JetBrains Mono,DejaVu Sans Mono,monospace" font-size="13" '
                   f'font-weight="700" fill="{TEAL}">{val}</text>')
        svg.append(f'<text x="{cx + 16}" y="{mid + 15}" font-family="Inter,system-ui,sans-serif" font-size="12" fill="#94A3B8">{name}</text>')
    # element outlines + badges
    for letter, x, y, w, h in ELEMS:
        svg.append(f'<rect x="{PX + x - 1.5}" y="{PY + y - 1.5}" width="{w + 3}" height="{h + 3}" rx="5" fill="none" '
                   f'stroke="{AMBER}" stroke-width="1.5" stroke-dasharray="4 3"/>')
        bx, by = PX + x + w + 1.5, PY + y - 1.5
        svg.append(f'<circle cx="{bx}" cy="{by}" r="9" fill="{AMBER}"/><text x="{bx}" y="{by + 4}" text-anchor="middle" '
                   f'font-family="Inter,system-ui,sans-serif" font-size="11" font-weight="800" fill="#2A1B00">{letter}</text>')
    legend = [('A', 'Icon button', '34 × 34'), ('B', 'URL field', '564 × 32'), ('C', 'Method chip', '58 × 23'),
              ('D', 'Toggle', '34 × 20'), ('E', 'Row menu ⋮', '24 × 24')]
    leg = ''.join(f'<div class="lg"><span class="bd">{l}</span><span>{n}</span><b>{s}</b></div>' for l, n, s in legend)
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>Stubgate dimensions</title><style>
*{{box-sizing:border-box;margin:0;padding:0}}
html,body{{width:1240px;height:780px;overflow:hidden}}
body{{background:{BG};color:#E5E7EB;font:13px/1.4 Inter,'Segoe UI',system-ui,sans-serif;position:relative;-webkit-font-smoothing:antialiased}}
.eyebrow{{position:absolute;left:24px;top:20px;font:600 11px 'JetBrains Mono','DejaVu Sans Mono',monospace;color:{TEAL};letter-spacing:.08em}}
.h1{{position:absolute;left:24px;top:38px;font-size:19px;font-weight:650}}
.pop{{position:absolute;left:{PX}px;top:{PY}px;width:800px;height:600px;border-radius:0;overflow:hidden;outline:1px solid #27344F}}
.pop iframe{{width:800px;height:600px;border:0;display:block}}
svg.ov{{position:absolute;left:0;top:0;width:1240px;height:780px;pointer-events:none}}
.leg{{position:absolute;left:{PX}px;top:{PY + 600 + 18}px;width:800px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}}
.lg{{display:flex;align-items:center;gap:7px;font-size:12px;color:#94A3B8;white-space:nowrap}}
.lg b{{font:700 12px 'JetBrains Mono','DejaVu Sans Mono',monospace;color:#E5E7EB}}
.bd{{width:18px;height:18px;border-radius:50%;background:{AMBER};color:#2A1B00;font:800 11px/18px Inter,sans-serif;text-align:center;flex:none}}
</style></head><body>
<div class="eyebrow">SCREEN 08</div><div class="h1">Dimensions: panel 800 × 600 px</div>
<div class="pop"><iframe src="01-rules-panel.html" scrolling="no"></iframe></div>
<svg class="ov" viewBox="0 0 1240 780">{''.join(svg)}</svg>
<div class="leg">{leg}</div>
</body></html>'''


def render(html_name, png, w, h, scale):
    subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
                    f'--force-device-scale-factor={scale}', f'--window-size={w},{h}', '--allow-file-access-from-files',
                    f'--screenshot={png}', f'file://{SRC / html_name}'], check=True, capture_output=True)
    print('rendered', png)


(SRC / '07-in-browser.html').write_text(screen07(), encoding='utf-8')
(SRC / '08-dimensions.html').write_text(screen08(), encoding='utf-8')
render('07-in-browser.html', UI / '07-in-browser.png', 1280, 800, 2)
render('07-in-browser.html', STORE / 'screenshot-1-1280x800.png', 1280, 800, 1)
render('08-dimensions.html', UI / '08-dimensions.png', 1240, 780, 2)
