#!/usr/bin/env python3
"""Screenshots of the real popup with the same 6 rules as the approved design (assets/ui/01-rules-panel)."""
import asyncio, pathlib, sys, tempfile, uuid
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'e2e'
J = {'Content-Type': 'application/json'}

def rule(label, method, url, status, delay=0, regex=False, enabled=True):
    return dict(id=uuid.uuid4().hex, label=label, enabled=enabled, type='mock',
                match=dict(method=method, url=url, isRegex=regex),
                response=dict(status=status, delayMs=delay, headers=J, body='{\n  "message": "OK",\n  "data": []\n}'), notes='')

RULES = [
    rule('user-profile', 'GET', 'https://api.ejemplo.com/v1/users/me', 200),
    rule('create-order', 'POST', 'https://api.ejemplo.com/v1/orders', 201, 800),
    rule('payment-timeout', 'POST', 'https://pay.ejemplo.com/v1/charge', 504, 8000),
    rule('list-products-empty', 'GET', 'https://api.ejemplo.com/v1/products?page=.*', 200, regex=True),
    rule('update-address', 'PUT', 'https://api.ejemplo.com/v1/customers/.*/address', 422, regex=True, enabled=False),
    rule('delete-session', 'DELETE', 'https://api.ejemplo.com/v1/session', 204, enabled=False),
]
STATS = {RULES[0]['id']: 12, RULES[1]['id']: 3, RULES[2]['id']: 1, RULES[3]['id']: 7}

async def main():
    ext = str(ROOT / '.output' / 'chrome-mv3')
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=False,
            args=['--headless=new', f'--disable-extensions-except={ext}', f'--load-extension={ext}'])
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker', timeout=10000)
        await sw.evaluate('(d) => chrome.storage.local.set(d)', dict(
            store=dict(schema=1, enabled=True, rules=RULES, settings=dict(language='en', theme='dark')), stats=STATS))
        ext_id = sw.url.split('/')[2]
        pop = await ctx.new_page()
        await pop.set_viewport_size({'width': 800, 'height': 600})
        await pop.goto(f'chrome-extension://{ext_id}/popup.html')
        await pop.wait_for_timeout(400)
        await pop.screenshot(path=str(OUT / 'real-01-list.png'))
        await pop.get_by_role('button', name='More').click()
        await pop.screenshot(path=str(OUT / 'real-04-more.png'))
        await pop.keyboard.press('Escape')
        await pop.get_by_role('button', name='Rule menu').nth(1).click()
        await pop.screenshot(path=str(OUT / 'real-05-rule-menu.png'))
        await pop.keyboard.press('Escape')
        await pop.get_by_role('button', name='New rule').click()
        await pop.wait_for_timeout(200)
        await pop.screenshot(path=str(OUT / 'real-03-new-rule.png'))
        await ctx.close()
asyncio.run(main())
