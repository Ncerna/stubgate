"""Tiny local server used by the spike tests: a real API plus a few test pages."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

INDEX = """<!doctype html><html><head><meta charset="utf-8"><title>Stubgate test page</title>
<script>
window.__frame = null;
window.addEventListener('message', e => { if (e.data && e.data.frame) window.__frame = e.data.frame; });
// Fired as the very first thing in <head>: tests that interception is ready at document_start.
window.__early = fetch('/api/users').then(r => r.json()).catch(e => ({error: String(e)}));
</script></head><body><h1>test page</h1><iframe src="/frame.html"></iframe></body></html>"""

FRAME = """<!doctype html><script>
fetch('/api/users').then(r => r.json())
  .then(j => parent.postMessage({frame: j}, '*'), e => parent.postMessage({frame: {error: String(e)}}, '*'));
</script>"""

CSP_PAGE = '<!doctype html><meta charset="utf-8"><script src="/early.js"></script><h1>csp page</h1>'
EARLY_JS = "window.__early = fetch('/api/users').then(r => r.json()).catch(e => ({error: String(e)}));"
WORKER_JS = """self.onmessage = async () => {
  try { const r = await fetch('/api/users'); postMessage(await r.json()); }
  catch (e) { postMessage({error: String(e)}); }
};"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype='text/html; charset=utf-8', headers=None):
        b = body.encode() if isinstance(body, str) else body
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(b)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(b)

    def _json(self, code, obj):
        self._send(code, json.dumps(obj), 'application/json', {'X-Source': 'real'})

    def do_GET(self):
        p = self.path.split('?')[0]
        if p == '/index.html':
            self._send(200, INDEX)
        elif p == '/frame.html':
            self._send(200, FRAME)
        elif p == '/csp.html':
            self._send(200, CSP_PAGE, headers={'Content-Security-Policy': "script-src 'self'"})
        elif p == '/early.js':
            self._send(200, EARLY_JS, 'application/javascript')
        elif p == '/worker.js':
            self._send(200, WORKER_JS, 'application/javascript')
        elif p == '/api/users':
            self._json(200, {'source': 'real', 'users': [1, 2, 3]})
        elif p.startswith('/api/'):
            self._json(200, {'source': 'real', 'path': p})
        else:
            self._send(404, 'not found')

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        self.rfile.read(n)
        self._json(201, {'source': 'real'})


def start(port):
    srv = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


if __name__ == '__main__':
    import sys
    import time
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    start(port)
    print(f'Test server running: http://localhost:{port}/index.html  (Ctrl+C to stop)')
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass
