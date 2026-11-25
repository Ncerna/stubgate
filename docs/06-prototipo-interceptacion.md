# Prototipo de interceptación

Se construyó un prototipo mínimo (carpeta `prototype/`) en **tres variantes** y se probó en **Chromium 158** con Playwright, usando un servidor local de pruebas. Es un experimento para decidir, no el código final.

| Variante | Cómo se inyecta el script de página |
|---|---|
| **A. `world: "MAIN"`** | Se declara en el manifest para que corra en el contexto de la página |
| **B. Script en línea** | El puente inserta un `<script>` con el código dentro |
| **C. Script con archivo** | El puente inserta un `<script src>` que apunta a un archivo de la extensión |

## Resultados

| Prueba | A | B | C |
|---|---|---|---|
| La extensión carga | ✅ | ✅ | ✅ |
| Primera petición de la página (`document_start`) | ✅ | ❌ | ❌ |
| Petición dentro de un iframe | ✅ | ❌ | ❌ |
| `fetch`: cuerpo, status, header y URL | ✅ | ❌ | ✅ |
| `XMLHttpRequest` con `responseType` json | ✅ | ❌ | ✅ |
| POST que devuelve un 500 simulado | ✅ | ❌ | ✅ |
| Retraso de 600 ms con una regla regex | ✅ | ❌ | ✅ |
| Una URL que no coincide va al servidor real | ✅ | ✅ | ✅ |
| URL de otro origen (sin la extensión la bloquearía CORS) | ✅ | ❌ | ✅ |
| Petición desde un web worker (se espera que **no** se intercepte) | ✅ | ✅ | ✅ |
| Regla editada con la página abierta, sin recargar | ✅ | ❌ | ✅ |
| Pausa global | ✅ | ✅ (trivial) | ✅ |
| Página con CSP `script-src 'self'` | ✅ | ❌ | ❌ |
| El contador de usos se guarda | ✅ | ❌ | ✅ |
| **Total** | **14/14** | **4/14** | **11/14** |

En la fila del web worker, ✅ significa que la limitación se confirmó: la respuesta fue la real. En la pausa, el ✅ de B es trivial porque esa variante nunca intercepta.

## Qué se aprendió

1. **La variante A funciona completa** y es la recomendada. Además es declarativa: no hay que insertar nada a mano.
2. **La B no sirve en Chromium con Manifest V3.** El navegador bloquea el script en línea con el error *"Executing inline script violates the following Content Security Policy directive…"*, aplicando la política de la propia extensión. Falla incluso en páginas sin CSP.
3. **La C intercepta, pero llega tarde.** El archivo se carga de forma asíncrona y la primera petición de la página (y la del iframe) se escapa. Solo sirve de plan B para un navegador que no admita `world`, con esa limitación. En la página con CSP no se puede separar si falla por la política o por llegar tarde: esa prueba solo mira la primera petición.
4. **Los web workers no se interceptan** en ninguna variante. Hay que documentarlo como limitación conocida del producto.
5. **Las URLs de otro origen se simulan sin problema**, aunque sin la extensión el navegador las bloquearía por CORS. Es útil cuando el backend real aún no existe.
6. **No hizo falta `host_permissions`:** bastan las coincidencias de los scripts de contenido. Aun así, abarcar todos los sitios hace que el navegador avise de acceso amplio. Decisión posterior: se acepta, porque Stubgate debe funcionar en cualquier sitio y es la regla quien decide qué se simula (ver «Decisiones ya tomadas» en [05-arquitectura.md](05-arquitectura.md)).

## Lo que NO se probó

- **Firefox.** MDN confirma que la propiedad `world: "MAIN"` existe, pero la página consultada no indica desde qué versión funciona en Firefox. Se incluye `prototype/dist/firefox-main` para probarlo a mano (pasos en `prototype/README.md`).
- **Safari, Edge, Brave y Opera.** Se espera que Edge, Brave y Opera se comporten como Chromium, pero no se verificó.
- **Casos fuera del prototipo:** `XMLHttpRequest` síncrono (no soportado: el envío se aplaza), cancelación con `AbortController`, respuestas en streaming, `WebSocket`, `EventSource` y `navigator.sendBeacon`.
- **Una sola versión de Chromium.**

Para repetir las pruebas, dentro de `prototype/`: `python3 build.py` y `python3 test/run_spike.py` (requiere Playwright con Chromium).
