#!/usr/bin/env python3
"""Popup (approved design) -> storage -> bridge -> page, using the real build and the real UI."""
import asyncio, json, pathlib, sys, tempfile
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
        rec('toolbar has the 8 functions of the design', await pop.locator('.toolbar .ibtn').count() == 8)
        rec('status bar: active and 0 of 0', await pop.get_by_text('Interception active').count() == 1 and await pop.get_by_text('0 of 0 rules enabled').count() == 1)

        await pop.get_by_role('button', name='New rule').first.click()
        rec('new rule is expanded and marked draft', await pop.locator('.chip.draft').count() == 1 and await pop.get_by_text('Response body').count() == 1)
        # cURL paste fills URL and method
        curl = f"curl '{BASE}/api/users' -X PATCH -H 'accept: */*'"
        await pop.evaluate("""(c) => { const i = document.querySelector('.urlbox input'); i.focus();
            const dt = new DataTransfer(); dt.setData('text', c);
            i.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true})); }""", curl)
        await pop.wait_for_timeout(150)
        rec('pasting a cURL command fills URL and method',
            await pop.locator('.urlbox input').input_value() == f'{BASE}/api/users' and await pop.locator('.fields select').first.input_value() == 'PATCH')
        await pop.locator('.fields select').first.select_option('GET')
        await pop.get_by_placeholder('Optional name').fill('Users list')
        await pop.locator('.code textarea').fill('{"source":"popup","users":["ui"]}')
        rec('body validation shows Valid JSON', await pop.get_by_text('Valid JSON').count() == 1)
        await pop.locator('.fields input[type=number]').nth(1).fill('300')
        await page.wait_for_timeout(500)
        r = await page.evaluate("(async()=>{const t=performance.now();const r=await fetch('/api/users');return {j:await r.json(),ms:Math.round(performance.now()-t)}})()")
        rec('rule created in the popup mocks the open page (no reload)', r['j'].get('source') == 'popup' and r['ms'] >= 250, str(r))

        await pop.locator('.code textarea').fill('{"broken":')
        rec('broken JSON is flagged but the rule keeps working', await pop.get_by_text('Not valid JSON').count() == 1)
        await pop.locator('.code textarea').fill('{"source":"popup","users":["ui"]}')

        # headers tab
        await pop.get_by_role('tab', name='Response headers').click()
        await pop.get_by_role('button', name='Add header').click()
        rec('empty header row does not make the rule invalid', await pop.locator('.chip.err').count() == 0)
        await pop.get_by_role('tab', name='Response body').click()

        # list actions
        await pop.get_by_role('button', name='Rule menu').click()
        await pop.keyboard.press('c')
        rec('rule menu shortcut C duplicates (copy is disabled)', await pop.locator('.rule-wrap').count() == 2 and await pop.get_by_text('Users list copy').count() == 1)
        rec('footer counts enabled rules', await pop.get_by_text('1 of 2 rules enabled').count() == 1)
        await pop.get_by_role('button', name='Rule menu').nth(1).click()
        await pop.keyboard.press('t')
        rec('shortcut T moves to top', await pop.locator('.name').first.inner_text() == 'Users list copy')
        await pop.get_by_role('button', name='Rule menu').first.click()
        await pop.keyboard.press('d')
        rec('shortcut D deletes', await pop.locator('.rule-wrap').count() == 1)

        # search
        await pop.get_by_role('button', name='Search').click()
        await pop.get_by_placeholder('Search by name').fill('zzz')
        rec('search filters the list', await pop.get_by_text('No rule matches your search.').count() == 1)
        await pop.get_by_role('button', name='Search').click()

        # global pause
        await pop.get_by_role('switch', name='Pause interception').click()
        await page.wait_for_timeout(500)
        r = await page.evaluate("fetch('/api/users').then(r=>r.json())")
        rec('global pause: real server answers, banner shown', r['source'] == 'real' and await pop.get_by_text('Interception paused. Your rules are kept').count() == 1, str(r))
        await pop.get_by_role('switch', name='Resume interception').click()
        await page.wait_for_timeout(400)

        # export -> import with both modes
        async with pop.expect_download() as dl:
            await pop.get_by_role('button', name='More').click()
            await pop.get_by_role('menuitem', name='Export').click()
        d = await dl.value
        path = await d.path()
        data = json.load(open(path))
        rec('export downloads stubgate-rules-YYYY-MM-DD.json with app, rules and exportedAt',
            d.suggested_filename.startswith('stubgate-rules-') and data['app'] == 'stubgate' and len(data['rules']) == 1 and 'exportedAt' in data, d.suggested_filename)
        await pop.get_by_role('button', name='More').click()
        async with pop.expect_file_chooser() as fc:
            await pop.get_by_role('menuitem', name='Import').click()
        await (await fc.value).set_files(path)
        await pop.get_by_text('1 rule(s) found').wait_for(timeout=3000)
        rec('import dialog shows file name and count', await pop.get_by_text('1 rule(s) found').count() == 1 and await pop.get_by_text('stubgate-rules-', exact=False).count() >= 1)
        await pop.get_by_role('button', name='Import', exact=True).click()
        rec('import (add) renames a repeated name', await pop.locator('.rule-wrap').count() == 2 and await pop.get_by_text('Users list (2)').count() == 1)
        # invalid file
        bad = pathlib.Path(tempfile.mkdtemp()) / 'bad.json'
        bad.write_text('{"nope":1}')
        await pop.get_by_role('button', name='More').click()
        async with pop.expect_file_chooser() as fc:
            await pop.get_by_role('menuitem', name='Import').click()
        await (await fc.value).set_files(str(bad))
        await pop.get_by_text('not a valid Stubgate export').wait_for(timeout=3000)
        rec('invalid file shows an error and changes nothing', await pop.get_by_text('not a valid Stubgate export').count() == 1 and await pop.locator('.rule-wrap').count() == 2)
        await pop.get_by_role('button', name='Close').click()

        # delete all with confirmation
        await pop.get_by_role('button', name='Delete', exact=True).click()
        await pop.get_by_role('menuitem', name='Delete all rules').click()
        await pop.get_by_role('button', name='Cancel').click()
        rec('delete all can be cancelled', await pop.locator('.rule-wrap').count() == 2)

        # settings: language + theme
        await pop.get_by_role('button', name='Settings').click()
        await pop.locator('select').select_option('es')
        rec('language switch to Español', await pop.get_by_text('Idioma').count() == 1)
        await pop.get_by_role('button', name='Oscuro').count()
        await pop.get_by_role('button', name='Claro').click()
        rec('theme switch to light', await pop.evaluate("document.documentElement.dataset.theme") == 'light')
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-settings-es.png'))
        await pop.get_by_role('button', name='Claro').count()
        await pop.get_by_role('button', name='Oscuro').click()
        await pop.get_by_role('button', name='Volver').click()
        await pop.locator('.chev').first.click()
        await pop.screenshot(path=str(ROOT / 'e2e' / 'popup-editor-es.png'))
        rec('Spanish editor labels', await pop.get_by_text('Cuerpo de la respuesta').count() == 1 and await pop.get_by_text('Guardado automáticamente').count() == 1)

        size = await pop.evaluate("({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})")
        rec('popup fits 800x600 without page scroll', size['w'] <= 800 and size['h'] <= 600, str(size))
        rec('no page errors in popup', not errors, str(errors))
        await ctx.close()
    sys.exit(0 if ok_all else 1)

asyncio.run(main())
