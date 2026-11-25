#!/usr/bin/env python3
"""Builds two variants of the spike from the same sources.

chromium-main : inject.js declared as a content script with world "MAIN" (declarative).
inline-tag    : bridge.js appends an inline <script> carrying inject.js (works without "world").
"""
import json
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent
SRC, DIST = ROOT / 'src', ROOT / 'dist'
if DIST.exists():
    shutil.rmtree(DIST)

COMMON = {"matches": ["<all_urls>"], "run_at": "document_start", "all_frames": True, "match_about_blank": True}


def manifest(content_scripts):
    return {
        "manifest_version": 3, "name": "Stubgate spike", "version": "0.0.1",
        "description": "Interception spike", "permissions": ["storage"],
        "background": {"service_worker": "background.js"},
        "content_scripts": content_scripts,
    }


d = DIST / 'chromium-main'
d.mkdir(parents=True)
for f in ('inject.js', 'bridge.js', 'background.js'):
    shutil.copy(SRC / f, d / f)
(d / 'manifest.json').write_text(json.dumps(manifest([
    {**COMMON, "js": ["inject.js"], "world": "MAIN"},
    {**COMMON, "js": ["bridge.js"]},
]), indent=2))

d = DIST / 'inline-tag'
d.mkdir(parents=True)
inject = (SRC / 'inject.js').read_text()
bridge = (SRC / 'bridge.js').read_text()
(d / 'bridge.js').write_text(
    "(() => { const s = document.createElement('script'); s.textContent = " + json.dumps(inject)
    + "; document.documentElement.appendChild(s); s.remove(); })();\n" + bridge)
shutil.copy(SRC / 'background.js', d / 'background.js')
(d / 'manifest.json').write_text(json.dumps(manifest([{**COMMON, "js": ["bridge.js"]}]), indent=2))

# src-tag: bridge appends <script src=...> pointing at a web-accessible extension file.
d = DIST / 'src-tag'
d.mkdir(parents=True)
shutil.copy(SRC / 'inject.js', d / 'inject.js')
shutil.copy(SRC / 'background.js', d / 'background.js')
(d / 'bridge.js').write_text(
    "(() => { const api = typeof browser !== 'undefined' ? browser : chrome;"
    " const s = document.createElement('script'); s.src = api.runtime.getURL('inject.js'); s.async = false;"
    " document.documentElement.appendChild(s); s.onload = () => s.remove(); })();\n" + bridge)
m = manifest([{**COMMON, "js": ["bridge.js"]}])
m["web_accessible_resources"] = [{"resources": ["inject.js"], "matches": ["<all_urls>"]}]
(d / 'manifest.json').write_text(json.dumps(m, indent=2))

# firefox-main: same as chromium-main, but with background.scripts (Firefox has no service_worker),
# an add-on id and host permissions (optional by default in Firefox MV3). NOT TESTED: no Firefox here.
d = DIST / 'firefox-main'
d.mkdir(parents=True)
for f in ('inject.js', 'bridge.js', 'background.js'):
    shutil.copy(SRC / f, d / f)
m = manifest([{**COMMON, "js": ["inject.js"], "world": "MAIN"}, {**COMMON, "js": ["bridge.js"]}])
m["background"] = {"scripts": ["background.js"]}
m["host_permissions"] = ["<all_urls>"]
m["browser_specific_settings"] = {"gecko": {"id": "spike@stubgate.example"}}
(d / 'manifest.json').write_text(json.dumps(m, indent=2))

print('built', sorted(p.name for p in DIST.iterdir()))
