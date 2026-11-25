# Cómo levantar el proyecto

Esta guía solo explica cómo **instalar y ejecutar** Stubgate en tu computadora. Para probarlo, ver [probar.md](probar.md); para publicarlo, [publicar.md](publicar.md).

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior (probado con 22) | Compilar y ejecutar el proyecto |
| npm | el que trae Node | Instalar dependencias |
| Chrome, Edge o Chromium | reciente | Probar en Chromium |
| Firefox | 128 o superior (la versión desde la que se espera que acepte `world: "MAIN"`; por verificar) | Probar en Firefox |

Python y Playwright solo hacen falta para las pruebas de extremo a extremo (ver [probar.md](probar.md)).

## 1. Instalar

```bash
cd extension
npm install
```

`npm install` también genera la carpeta `.wxt/` (tipos de WXT). Si falta, `npx wxt prepare` la vuelve a crear.

## 2. Ejecutar en modo desarrollo

```bash
npm run dev            # Chrome, con recarga automática
npm run dev:firefox    # Firefox (Manifest V3), con recarga automática
```

WXT abre un navegador con la extensión ya cargada. Al guardar un archivo, se recarga solo.

> **Aviso.** Chrome de marca (versión 137 o superior) ya no acepta cargar extensiones desde la línea de comandos, así que `npm run dev` puede abrir un navegador sin la extensión. Si pasa, usa la carga manual de abajo.

## 3. Carga manual (siempre funciona)

Compila:

```bash
npm run build            # genera .output/chrome-mv3
npm run build:firefox    # genera .output/firefox-mv3
```

**Chrome / Edge**
1. Abre `chrome://extensions` (en Edge, `edge://extensions`).
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y elige la carpeta `extension/.output/chrome-mv3`.
4. Fija el ícono de Stubgate en la barra para abrirlo con un clic.

**Firefox**
1. Abre `about:debugging#/runtime/this-firefox`.
2. Pulsa **Cargar complemento temporal…**.
3. Elige `extension/.output/firefox-mv3/manifest.json`.
4. El complemento temporal desaparece al cerrar Firefox; hay que cargarlo de nuevo.

Después de cambiar el código y volver a compilar, pulsa el botón de recargar de la extensión en `chrome://extensions`.

## 4. Comprobar que funciona

1. Abre cualquier página web.
2. Abre Stubgate y pulsa **+ Nueva regla**.
3. Escribe una URL que la página realmente llame, un cuerpo como `{"ok":true}` y espera a ver «Guardado automáticamente».
4. No hace falta recargar: la regla se aplica a la página que ya está abierta.
5. Pausa con el interruptor de la cabecera: la página vuelve a recibir la respuesta real.

## Comandos del proyecto

| Comando | Qué hace |
|---|---|
| `npm run dev` / `dev:firefox` | Desarrollo con recarga |
| `npm run build` / `build:firefox` | Compilación de producción en `.output/` |
| `npm run zip` / `zip:firefox` | Paquetes para las tiendas (ver [publicar.md](publicar.md)) |
| `npm test` | Pruebas unitarias |
| `npm run typecheck` | Comprobación de tipos |

## Estructura del código

```
extension/
├── wxt.config.ts          manifest y configuración de WXT
├── public/icons/          íconos 16, 32, 48 y 128
├── src/
│   ├── core/              TypeScript puro, sin APIs del navegador (reglas, coincidencia, validación…)
│   ├── page/              script de página: envuelve fetch y XMLHttpRequest
│   ├── platform/          protocolo de mensajes y almacenamiento (único archivo que toca storage)
│   ├── ui/                diccionarios es/en y hook del almacenamiento
│   └── entrypoints/       inject, bridge, background y popup
└── e2e/                   pruebas de extremo a extremo (Python + Playwright)
```

La explicación de cada capa está en [../05-arquitectura.md](../05-arquitectura.md).

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `Cannot find global value 'Promise'` o `Tsconfig not found` | Falta `.wxt/`. Ejecuta `npx wxt prepare` |
| `No entrypoints found` | Se ejecutó WXT sin `src/entrypoints`. Comprueba que estás dentro de `extension/` |
| `npm run dev` abre Chrome sin la extensión | Chrome de marca ≥ 137. Usa la carga manual |
| La regla no se aplica | Mira si la fila muestra «No se aplica: la regla tiene errores», si la pausa global está activa y si la URL y el método coinciden exactamente |
| La petición sale real aunque haya regla | Puede venir de un *web worker* (no se interceptan) |
