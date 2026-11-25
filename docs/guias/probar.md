# Cómo probar el proyecto

Hay tres niveles de prueba. Para instalar y ejecutar, ver [levantar.md](levantar.md).

| Nivel | Qué comprueba | Necesita navegador | Comando |
|---|---|---|---|
| 1. Unitarias | El núcleo: coincidencia, validación, migración, contador | No | `npm test` |
| 2. Extremo a extremo | La extensión real compilada, en un Chromium de verdad | Sí (Playwright) | `python3 e2e/run.py`, `python3 e2e/popup.py` |
| 3. Manual | Lo que no se automatiza: Firefox, aspecto, uso real | Sí | Lista de abajo |

## 1. Pruebas unitarias y tipos

```bash
cd extension
npm test               # Vitest, unas 46 pruebas, menos de 2 s
npm run typecheck      # tsc --noEmit, debe terminar sin salida
```

Archivos: `src/core/*.test.ts`.

| Archivo | Cubre |
|---|---|
| `match.test.ts` | URL exacta, regex, método `ANY`, primera regla gana, reglas ignoradas |
| `validate.test.ts` | Estado 200–599, retraso, cabeceras, regex, filas vacías |
| `response.test.ts` | Respuesta sin cuerpo (204/205/304), texto del estado, `new Response` real |
| `migrate.test.ts` | Datos dañados o de versiones antiguas |
| `hits.test.ts` | Contador sin pérdidas (usa temporizadores falsos) |

## 2. Pruebas de extremo a extremo

Cargan el build real de Chrome en un Chromium de Playwright y miran lo que ve una página.

**Preparación (una vez)**
```bash
pip install playwright
playwright install chromium
```

**Cada vez**
```bash
cd extension
npm run build            # las pruebas usan .output/chrome-mv3
python3 e2e/run.py       # interceptación
python3 e2e/popup.py     # interfaz del popup
```

Ambos scripts levantan solos un servidor local en el puerto 8765 (`e2e/server.py`). Si el puerto está ocupado, libéralo.

| Script | Comprobaciones | Qué verifica |
|---|---|---|
| `e2e/run.py` | 19 | Primera petición simulada, iframe, `fetch`, `XMLHttpRequest`, POST 500, retraso, otro origen, iframes `srcdoc` y `about:blank`, página sin regla intacta, 204, regla inválida y desactivada ignoradas, edición en vivo, pausa global, contador de usos, recarga |
| `e2e/popup.py` | 10 | Estado vacío, crear regla desde el panel y verla aplicada sin recargar, lista, pausa, cambio de idioma, cabecera vacía, ajuste a 800 × 600, sin errores |

Salidas: `e2e/results.json` y capturas `e2e/popup-*.png` (útiles para revisar el aspecto).

> **Nota.** Estas pruebas usan el Chromium de Playwright porque Chrome de marca (≥ 137) no permite cargar extensiones desde la línea de comandos. No sirven para Firefox.

## 3. Lista de prueba manual

Hazla antes de cada publicación, en Chrome y en Firefox.

**Reglas**
- [ ] Crear una regla; el panel muestra «Guardado automáticamente».
- [ ] Editar URL, método, estado, retraso, cuerpo y cabeceras.
- [ ] Cerrar el panel a mitad de edición y abrirlo: el cambio está guardado.
- [ ] Duplicar, mover con ↑ y ↓, eliminar (pide confirmación).
- [ ] Buscar por nombre, URL y método.

**Simulación**
- [ ] Una regla con estado 500 hace fallar a la página como se espera.
- [ ] Una regla con retraso de 2000 ms retrasa la respuesta.
- [ ] Una regla con regex coincide con varias URL.
- [ ] Con dos reglas que coinciden, gana la de arriba; al cambiar el orden, cambia el resultado.
- [ ] Una regla con error muestra el aviso y no se aplica.
- [ ] Pausa global: la página recibe la respuesta real.

**Datos**
- [ ] Exportar, borrar las reglas, importar el archivo: vuelven todas, sin duplicar ids.
- [ ] Importar un archivo cualquiera que no sea de Stubgate: muestra aviso y no cambia nada.
- [ ] Cerrar y abrir el navegador: las reglas siguen.

**Idioma y aspecto**
- [ ] Cambiar a Español y a English en Ajustes: todo el panel cambia, sin textos cortados.
- [ ] «Automático» sigue el idioma del navegador.
- [ ] El panel cabe en 800 × 600 sin barras de desplazamiento propias en la lista vacía.

**Firefox (carga temporal, ver [levantar.md](levantar.md))**
- [ ] El complemento carga sin errores en `about:debugging`.
- [ ] Una regla sobre una página real se aplica, **incluida la primera petición** de la página.
- [ ] La edición se aplica sin recargar.
- [ ] Anotar el resultado en [../History_user01.md](../History_user01.md) (grupo G10, HU-28).

## Qué no se prueba todavía

- Firefox y Safari de forma automática.
- La importación con un archivo real (la lógica reutiliza `migrate`, pero no tiene prueba propia).
- La cancelación de peticiones (`AbortSignal`, `abort()`).
- *Web workers*: no se interceptan; no hay prueba que lo confirme en el build real.
- El modo claro, pantalla por pantalla.

## Cuando una prueba falla

1. Ejecuta `npm run build` de nuevo: las pruebas de extremo a extremo miran `.output/`, no el código fuente.
2. Mira `e2e/results.json` y las capturas.
3. Reproduce a mano con la carga manual de [levantar.md](levantar.md).
