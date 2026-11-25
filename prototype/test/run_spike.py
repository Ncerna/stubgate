#!/usr/bin/env python3
"""Loads each spike variant into Chromium and checks the interception behaviour."""
import asyncio
import json
import pathlib
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from playwright.async_api import async_playwright  # noqa: E402
from server import start  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8765
BASE = f'http://localhost:{PORT}'
CROSS = f'http://127.0.0.1:{PORT}'


def rule(id, method, url, status=200, body='{}', delay=0, regex=False, headers=None):
    return dict(id=id, enabled=True, method=method, url=url, isRegex=regex, status=status, delayMs=delay,
                headers=headers or {'Content-Type': 'application/json'}, body=body)


def rules(users_body):
    return [
        rule('r1', 'GET', f'{BASE}/api/users', body=users_body,
             headers={'Content-Type': 'application/json', 'X-Source': 'stubgate'}),
        rule('r2', 'GET', r'/api/slow$', body='{"source":"stubgate","slow":true}', delay=600, regex=True),
        rule('r3', 'POST', f'{BASE}/api/orders', status=500, body='{"error":"boom"}'),
        rule('r4', 'GET', f'{CROSS}/api/users', body='{"source":"stubgate-cross"}'),
    ]


USERS_V1 = json.dumps({'source': 'stubgate', 'users': []})
USERS_V2 = json.dumps({'source': 'stubgate', 'users': ['updated']})

JS_FETCH = """async (u) => { const r = await fetch(u);
  return {status: r.status, header: r.headers.get('x-source'), json: await r.json(), url: r.url}; }"""
JS_FETCH_POST = """async () => { const r = await fetch('/api/orders', {method: 'POST', body: '{}'});
  return {status: r.status, json: await r.json()}; }"""
JS_XHR = """() => new Promise(res => { const x = new XMLHttpRequest(); x.open('GET', '/api/users');
  x.responseType = 'json';
  x.onload = () => res({status: x.status, header: x.getResponseHeader('x-source'), json: x.response});
  x.onerror = () => res({error: 'xhr error'}); x.send(); })"""
JS_TIMED = """async () => { const t = performance.now(); const r = await fetch('/api/slow');
  return {ms: Math.round(performance.now() - t), json: await r.json()}; }"""
JS_WORKER = """() => new Promise(res => { const w = new Worker('/worker.js');
  w.onmessage = e => res(e.data); w.postMessage(1); })"""

results = {}


def rec(variant, name, ok, detail=''):
    results.setdefault(variant, []).append({'test': name, 'ok': bool(ok), 'detail': detail})
    print(f"[{variant}] {'PASS' if ok else 'FAIL'}  {name}  {detail}")


async def ev(page, js, arg=None):
    try:
        return await page.evaluate(js, arg) if arg is not None else await page.evaluate(js)
    except Exception as e:  # noqa: BLE001
        return {'error': str(e)[:120]}


async def run_variant(p, variant):
    ext = str(ROOT / 'dist' / variant)
    ctx = await p.chromium.launch_persistent_context(
        tempfile.mkdtemp(), headless=False,
        args=['--headless=new', f'--disable-extensions-except={ext}', f'--load-extension={ext}'])
    try:
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker', timeout=10000)
    except Exception as e:  # noqa: BLE001
        rec(variant, 'extension loads', False, str(e)[:100])
        await ctx.close()
        return
    rec(variant, 'extension loads', True)
    set_storage = '(a) => chrome.storage.local.set(a)'
    await sw.evaluate(set_storage, dict(rules=rules(USERS_V1), enabled=True, hits={}))

    page = await ctx.new_page()
    await page.goto(f'{BASE}/index.html')
    await page.wait_for_load_state('load')

    early = await ev(page, 'window.__early')
    rec(variant, 'first request of the page (document_start) is mocked', early.get('source') == 'stubgate', str(early))

    try:
        await page.wait_for_function('window.__frame !== null', timeout=8000)
        frame = await page.evaluate('window.__frame')
    except Exception as e:  # noqa: BLE001
        frame = {'error': str(e)[:80]}
    rec(variant, 'request made inside an iframe is mocked', frame.get('source') == 'stubgate', str(frame))

    r = await ev(page, JS_FETCH, '/api/users')
    rec(variant, 'fetch: body, status, header and url', r.get('json', {}).get('source') == 'stubgate'
        and r.get('status') == 200 and r.get('header') == 'stubgate' and str(r.get('url', '')).endswith('/api/users'), str(r))

    r = await ev(page, JS_XHR)
    rec(variant, 'XMLHttpRequest (responseType json)', r.get('json', {}).get('source') == 'stubgate'
        and r.get('header') == 'stubgate', str(r))

    r = await ev(page, JS_FETCH_POST)
    rec(variant, 'POST returns the simulated 500', r.get('status') == 500 and r.get('json', {}).get('error') == 'boom', str(r))

    r = await ev(page, JS_TIMED)
    rec(variant, 'delay of 600 ms is applied (regex rule)', r.get('ms', 0) >= 550 and r.get('json', {}).get('slow') is True, str(r))

    r = await ev(page, JS_FETCH, '/api/other')
    rec(variant, 'non-matching URL goes to the real server', r.get('json', {}).get('source') == 'real', str(r))

    r = await ev(page, JS_FETCH, f'{CROSS}/api/users')
    rec(variant, 'cross-origin URL is mocked (real one would be blocked by CORS)',
        r.get('json', {}).get('source') == 'stubgate-cross', str(r))

    r = await ev(page, JS_WORKER)
    rec(variant, 'request made from a web worker (KNOWN LIMITATION: real response expected)',
        r.get('source') == 'real', str(r))

    await sw.evaluate(set_storage, dict(rules=rules(USERS_V2)))
    await asyncio.sleep(0.4)
    r = await ev(page, JS_FETCH, '/api/users')
    rec(variant, 'rule edited while the page is open applies without reload',
        r.get('json', {}).get('users') == ['updated'], str(r))

    await sw.evaluate(set_storage, dict(enabled=False))
    await asyncio.sleep(0.4)
    r = await ev(page, JS_FETCH, '/api/users')
    rec(variant, 'global pause sends requests to the real server', r.get('json', {}).get('source') == 'real', str(r))
    await sw.evaluate(set_storage, dict(enabled=True))
    await asyncio.sleep(0.4)

    csp = await ctx.new_page()
    await csp.goto(f'{BASE}/csp.html')
    await csp.wait_for_load_state('load')
    early = await ev(csp, 'window.__early')
    rec(variant, "page with CSP script-src 'self': first request is mocked", early.get('source') == 'stubgate', str(early))

    hits = await sw.evaluate("() => chrome.storage.local.get('hits')")
    total = sum((hits.get('hits') or {}).values())
    rec(variant, 'hit counter is updated in storage', total > 0, str(hits.get('hits')))
    await ctx.close()


async def main():
    start(PORT)
    async with async_playwright() as p:
        for v in ('chromium-main', 'inline-tag', 'src-tag'):
            await run_variant(p, v)
    (ROOT / 'test' / 'results.json').write_text(json.dumps(results, indent=2))
    for v, rs in results.items():
        print(f"== {v}: {sum(r['ok'] for r in rs)}/{len(rs)} passed")


asyncio.run(main())
