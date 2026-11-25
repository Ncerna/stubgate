#!/usr/bin/env python3
"""End-to-end check of the REAL build (.output/chrome-mv3) in Chromium.
Seeds storage the same way the popup will, then checks what a page sees."""
import asyncio, json, pathlib, sys, tempfile, uuid
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from playwright.async_api import async_playwright
from server import start

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8765
BASE = f'http://localhost:{PORT}'
CROSS = f'http://127.0.0.1:{PORT}'
JSON_H = {'Content-Type': 'application/json'}


def rule(method, url, status=200, body='{}', delay=0, regex=False, headers=None, enabled=True):
    return dict(id=uuid.uuid4().hex, label='', enabled=enabled, type='mock',
                match=dict(method=method, url=url, isRegex=regex),
                response=dict(status=status, delayMs=delay, headers=headers or JSON_H, body=body), notes='')


def store(rules, enabled=True):
    return dict(schema=1, enabled=enabled, rules=rules, settings=dict(language='auto', theme='dark'))


users = rule('GET', f'{BASE}/api/users', body='{"source":"stubgate","users":[]}',
             headers={**JSON_H, 'X-Source': 'stubgate'})
slow = rule('GET', r'/api/slow$', body='{"source":"stubgate","slow":true}', delay=600, regex=True)
orders = rule('POST', f'{BASE}/api/orders', status=500, body='{"error":"boom"}')
cross = rule('GET', f'{CROSS}/api/users', body='{"source":"stubgate-cross"}')
empty = rule('DELETE', f'{BASE}/api/items/1', status=204, body='ignored')
bad = rule('GET', f'{BASE}/api/bad', status=99)           # invalid: must be ignored, not break the page
off = rule('GET', f'{BASE}/api/off', enabled=False)

JS_FETCH = """async (u) => { const r = await fetch(u);
  return {status: r.status, header: r.headers.get('x-source'), json: await r.json(), url: r.url}; }"""
JS_POST = """async () => { const r = await fetch('/api/orders', {method:'POST', body:'{}'});
  return {status: r.status, json: await r.json()}; }"""
JS_XHR = """() => new Promise(res => { const x = new XMLHttpRequest(); x.open('GET','/api/users');
  x.responseType='json'; x.onload = () => res({status:x.status, header:x.getResponseHeader('x-source'), json:x.response});
  x.onerror = () => res({error:'xhr error'}); x.send(); })"""
JS_TIMED = """async () => { const t = performance.now(); const r = await fetch('/api/slow');
  return {ms: Math.round(performance.now()-t), json: await r.json()}; }"""
JS_204 = """async () => { const r = await fetch('/api/items/1', {method:'DELETE'}); return {status:r.status, text: await r.text()}; }"""
JS_SAFE = """async (u) => { try { const r = await fetch(u); return {status:r.status}; } catch(e) { return {error:String(e)}; } }"""

results = []


def rec(name, ok, detail=''):
    results.append(dict(test=name, ok=bool(ok), detail=detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


async def main():
    start(PORT)
    ext = str(ROOT / '.output' / 'chrome-mv3')
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), headless=False,
            args=['--headless=new', f'--disable-extensions-except={ext}', f'--load-extension={ext}'])
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker', timeout=10000)
        rec('extension loads', True)
        seed = lambda s: sw.evaluate('(s) => chrome.storage.local.set({store: s})', s)
        await seed(store([users, slow, orders, cross, empty, bad, off]))

        page = await ctx.new_page()
        await page.goto(BASE + '/index.html')
        await page.wait_for_timeout(300)
        early = await page.evaluate('window.__early')
        rec('first request of the page is mocked', early.get('source') == 'stubgate', str(early))
        frame = await page.evaluate('window.__frame')
        rec('request inside an iframe is mocked', (frame or {}).get('source') == 'stubgate', str(frame))

        r = await page.evaluate(JS_FETCH, '/api/users')
        rec('fetch: status, header, body, url', r['status'] == 200 and r['header'] == 'stubgate'
            and r['json']['source'] == 'stubgate' and r['url'].endswith('/api/users'), str(r))
        r = await page.evaluate(JS_XHR)
        rec('XMLHttpRequest (responseType json)', r.get('json', {}).get('source') == 'stubgate' and r.get('header') == 'stubgate', str(r))
        r = await page.evaluate(JS_POST)
        rec('POST rule answers 500', r['status'] == 500 and r['json'] == {'error': 'boom'}, str(r))
        r = await page.evaluate(JS_TIMED)
        rec('delay is applied (>= 550 ms)', r['ms'] >= 550 and r['json']['slow'] is True, str(r))
        r = await page.evaluate(JS_FETCH, CROSS + '/api/users')
        rec('cross-origin request is mocked', r['json']['source'] == 'stubgate-cross', str(r))
        r = await page.evaluate(JS_204)
        rec('204 answers with an empty body', r['status'] == 204 and r['text'] == '', str(r))
        r = await page.evaluate(JS_SAFE, '/api/bad')
        rec('rule with invalid status is ignored (real server answers)', r.get('status') == 200, str(r))
        r = await page.evaluate(JS_SAFE, '/api/off')
        rec('disabled rule is ignored', r.get('status') == 200, str(r))


        # frames without their own URL: the match patterns must still cover them
        JS_SRCDOC = """() => new Promise(res => { const f = document.createElement('iframe');
          f.srcdoc = '<script>fetch("' + location.origin + '/api/users").then(r=>r.json()).then(j=>parent.postMessage({srcdoc:j},"*"))<\\/script>';
          addEventListener('message', e => { if (e.data && e.data.srcdoc) res(e.data.srcdoc); }); document.body.appendChild(f); })"""
        JS_BLANK = """() => new Promise(res => { const f = document.createElement('iframe'); document.body.appendChild(f);
          f.contentWindow.fetch(location.origin + '/api/users').then(r => r.json()).then(res, e => res({error: String(e)})); })"""
        r = await page.evaluate(JS_SRCDOC)
        rec('iframe with srcdoc is mocked', r.get('source') == 'stubgate', str(r))
        r = await page.evaluate(JS_BLANK)
        rec('iframe about:blank (created from the page) is mocked', r.get('source') == 'stubgate', str(r))

        # a request with no matching rule goes to the real server untouched
        r = await page.evaluate(JS_SAFE, '/api/not-configured')
        rec('request with no matching rule reaches the real server', r.get('status') == 200, str(r))

        # live edit: no reload
        changed = dict(users, response=dict(users['response'], body='{"source":"stubgate","users":["new"]}'))
        await seed(store([changed, slow, orders, cross, empty, bad, off]))
        await page.wait_for_timeout(300)
        r = await page.evaluate(JS_FETCH, '/api/users')
        rec('live edit applies without reload', r['json'].get('users') == ['new'], str(r))

        # global pause
        await seed(store([changed, slow, orders, cross, empty, bad, off], enabled=False))
        await page.wait_for_timeout(300)
        r = await page.evaluate(JS_FETCH, '/api/users')
        rec('global pause: the real server answers', 'source' not in r['json'] or r['json'].get('source') != 'stubgate', str(r))
        await seed(store([changed, slow, orders, cross, empty, bad, off], enabled=True))
        await page.wait_for_timeout(300)

        # hits
        await page.wait_for_timeout(1200)
        stats = await sw.evaluate('() => chrome.storage.local.get("stats")')
        n = (stats.get('stats') or {}).get(users['id'], 0)
        rec('hits are counted in stats (and not in the rules)', n >= 3, str(stats))
        s = await sw.evaluate('() => chrome.storage.local.get("store")')
        rec('rules are not rewritten by counting', all('hits' not in x for x in s['store']['rules']))

        # reload: first request mocked again with persisted rules
        await page.reload()
        await page.wait_for_timeout(300)
        early = await page.evaluate('window.__early')
        rec('after reload the first request is still mocked', early.get('source') == 'stubgate', str(early))
        await ctx.close()

    failed = [r for r in results if not r['ok']]
    (ROOT / 'e2e' / 'results.json').write_text(json.dumps(results, indent=2))
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    sys.exit(1 if failed else 0)


asyncio.run(main())
