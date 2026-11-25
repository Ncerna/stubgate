#!/usr/bin/env python3
"""Popup -> storage -> bridge -> page, using the real build and the real UI."""
import asyncio, pathlib, sys, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from playwright.async_api import async_playwright
from server import start

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8765
BASE = f'http://localhost:{PORT}'
ok_all = True


def rec(name, ok, detail=''):
    global ok_all
    ok_all &= bool(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")


async def main():
    start(PORT)
    ext = str(ROOT / '.output' / 'chrome-mv3')
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            tempfile.mkdtemp(), headless=False,
            args=['--headless=new', f'--disable-extensions-except={ext}', f'--load-extension={ext}'])
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker', timeout=10000)
        ext_id = sw.url.split('/')[2]
        page = await ctx.new_page()
        await page.goto(BASE + '/index.html')
        r = await page.evaluate("fetch('/api/users').then(r=>r.json())")
        rec('before: real server answers', r['source'] == 'real')

        pop = await ctx.new_page()
        errors = []
        pop.on('pageerror', lambda e: errors.append(str(e)))
        await pop.set_viewport_size({'width': 800, 'height': 600})
        await pop.goto(f'chrome-extension://{ext_id}/popup.html')
        rec('empty state is shown', await pop.locator('.empty').count() == 1)
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-empty.png'))

        await pop.get_by_role('button', name='+ New rule').first.click()
        await pop.get_by_placeholder('e.g. Users list').fill('Users list')
        await pop.get_by_placeholder('https://api.example.com/users').fill(BASE + '/api/users')
        await pop.locator('textarea.body').fill('{"source":"popup","users":["ui"]}')
        await pop.locator('input[type=number]').nth(1).fill('300')
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-editor.png'))
        await page.wait_for_timeout(500)
        r = await page.evaluate("(async()=>{const t=performance.now();const r=await fetch('/api/users');return {j:await r.json(),ms:Math.round(performance.now()-t)}})()")
        rec('rule created in the popup mocks the open page (no reload)', r['j'].get('source') == 'popup' and r['ms'] >= 250, str(r))

        await pop.get_by_role('button', name='Back').click()
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-list.png'))
        rec('rule appears in the list', await pop.get_by_text('Users list').count() == 1)

        await pop.get_by_role('switch', name='Pause all rules').click()
        await page.wait_for_timeout(500)
        r = await page.evaluate("fetch('/api/users').then(r=>r.json())")
        rec('global pause from the popup: real server answers', r['source'] == 'real', str(r))
        await pop.get_by_role('switch', name='Resume all rules').click()

        await pop.get_by_role('button', name='Menu').click()
        await pop.get_by_role('menuitem', name='Settings').click()
        await pop.locator('select').select_option('es')
        rec('language switch to Español', await pop.get_by_text('Idioma').count() == 1)
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-settings-es.png'))
        await pop.get_by_role('button', name='Volver').click()
        rec('Spanish list view', await pop.get_by_text('Buscar reglas…', exact=False).count() >= 0 and await pop.locator('input[type=search]').get_attribute('placeholder') == 'Buscar reglas…')

        await pop.get_by_text('Users list').click()
        await pop.get_by_role('button', name='+ Añadir cabecera').click()
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-editor-es.png'))
        r = await page.evaluate("fetch('/api/users').then(r=>r.json())")
        rec('empty header row does not disable the rule', r.get('source') == 'popup', str(r))

        size = await pop.evaluate("({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})")
        rec('popup fits 800x600 without scrolling', size['w'] <= 800 and size['h'] <= 600, str(size))
        rec('no page errors in popup', not errors, str(errors))
        await ctx.close()
    sys.exit(0 if ok_all else 1)

asyncio.run(main())
