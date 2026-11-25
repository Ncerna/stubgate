# Stubgate: prototipo de interceptación

Experimento para comprobar que se puede interceptar `fetch` y `XMLHttpRequest` desde una extensión
y devolver una respuesta simulada. **No es el código final.**

```
src/        inject.js (contexto de la página), bridge.js (puente), background.js
build.py    genera las variantes en dist/
dist/       chromium-main  → variante recomendada (world "MAIN")
            firefox-main   → igual, con background.scripts para Firefox (SIN PROBAR)
            inline-tag     → script en línea (no funciona en Chromium MV3, se conserva como evidencia)
            src-tag        → <script src> (intercepta, pero llega tarde)
test/       servidor local, run_spike.py (pruebas automáticas en Chromium), results.json
```

## Repetir las pruebas automáticas (Chromium)

```
python3 build.py
python3 test/run_spike.py
```

Requiere Python con Playwright y su Chromium.

## Probar a mano en Firefox (lo que falta por verificar)

1. En una terminal: `python3 test/server.py` (abre un servidor en `http://localhost:8765`).
2. En Firefox: `about:debugging#/runtime/this-firefox` → **Cargar complemento temporal** → elige
   `dist/firefox-main/manifest.json`.
3. En Firefox MV3 el acceso a los sitios es opcional: en `about:addons` → la extensión → **Permisos**,
   activa el acceso a todos los sitios. Si no intercepta, empieza por revisar esto.
4. En `about:debugging`, pulsa **Inspeccionar** en la extensión y, en su consola, pega:

```js
browser.storage.local.set({ enabled: true, rules: [{
  id: 'r1', enabled: true, method: 'GET', url: 'http://localhost:8765/api/users', isRegex: false,
  status: 200, delayMs: 0, headers: { 'Content-Type': 'application/json' },
  body: '{"source":"stubgate"}'
}] })
```

5. Abre `http://localhost:8765/index.html` y, en la consola de la página, ejecuta:

```js
await window.__early                                   // primera petición de la página
await (await fetch('/api/users')).json()               // petición normal
```

Si ves `{"source":"stubgate"}` está interceptando. Si ves `{"source":"real","users":[1,2,3]}`, no.
Apunta también si `window.__early` (la primera petición) llegó simulada o real.

Para Chrome es igual, pero cargando `dist/chromium-main` en `chrome://extensions` (modo desarrollador →
**Cargar descomprimida**), usando `chrome.storage` en la consola del service worker.
