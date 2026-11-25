# Arquitectura

La escalabilidad viene de separar bien las capas, no de usar herramientas pesadas. Cada capa solo conoce a la de al lado.

| Capa | Dónde corre | Responsabilidad |
|---|---|---|
| **Núcleo** | En cualquier lado (TypeScript puro, sin APIs del navegador) | Modelo de regla, coincidencia de URL y método, armado de la respuesta, validación y migración de versiones del formato guardado. Se prueba sin abrir un navegador |
| **Script de página** (`inject`) | Contexto de la página (`world: "MAIN"`) | Envuelve `fetch` y `XMLHttpRequest` y responde con la regla que coincida |
| **Puente** (`bridge`) | Contexto aislado de la extensión | Lee las reglas del almacenamiento y las envía a la página; avisa de cada uso |
| **Segundo plano** | Service worker o página de eventos | Estado global, contador de usos y estado del ícono |
| **Interfaz** | Panel (popup) y, más adelante, pestaña completa | Edita las reglas; solo habla con el almacenamiento |
| **Adaptadores** | Alrededor de todo | Almacenamiento, mensajes, idioma y permisos. Aquí viven las diferencias entre navegadores |

**Flujo de una petición**

```
La página llama a fetch / XHR  ->  script de página: ¿hay una regla que coincida?
   no  ->  sigue al servidor real
   sí  ->  espera el delay  ->  devuelve la respuesta simulada  ->  avisa al puente  ->  segundo plano suma el uso
```

## Decisiones ya tomadas

- **Funciona en cualquier sitio web; la regla decide dónde actúa.** Los scripts de contenido se declaran con los patrones `http://*/*` y `https://*/*` (todos los marcos, incluidos `about:blank` y `srcdoc`), definidos en un solo archivo (`src/platform/matches.ts`) que usan ambos scripts y los `host_permissions` de Firefox. Una página sin regla que coincida no se toca: la petición sigue al servidor real. No se incluyen `file://` (en Chrome requiere que el usuario lo active aparte), `ftp://` ni las páginas internas del navegador, donde las extensiones no pueden actuar. Consecuencia aceptada: el navegador muestra aviso de acceso amplio al instalar.
- La regla que está más arriba en la lista tiene prioridad: gana la primera que coincide.
- El puente envía las reglas a la página y las vuelve a enviar cada vez que cambian. Por eso una regla editada se aplica **sin recargar la página** (comprobado en el prototipo).
- El script de página espera a recibir las reglas, con un máximo de 1,5 s, antes de decidir. Así la primera petición de la página no se escapa.
- El formato guardado y el archivo exportado llevan número de versión.
- El acceso a funciones de pago pasa por `can()` y los textos por diccionarios de idioma (ver [04-idioma.md](04-idioma.md) y «Planes y suscripción» en [01-producto.md](01-producto.md)).

## Riesgos conocidos

- **El contador de usos** (resuelto): los usos se guardan aparte de las reglas (`stats`), se acumulan en memoria y se escriben por lotes y de una en una; si una escritura falla, el lote se reintenta. Cubierto por tests. Queda un caso límite: si el service worker se detiene con usos sin guardar, se puede perder el último lote (menos de 0,4 s).
- **El script de página es visible para la página:** esta puede detectarlo o interferir con él. Es inherente a este método.
- **Los web workers no se interceptan** (ver [06-prototipo-interceptacion.md](06-prototipo-interceptacion.md)).

# Navegadores objetivo

Stubgate será una extensión para **cualquier navegador**: un solo código y un solo diseño para todos. Se construye una vez con las APIs estándar de extensiones (WebExtensions) y se publica por etapas.

| Etapa | Navegadores | Notas |
|---|---|---|
| 1 | Chrome, Edge, Brave, Opera, Vivaldi y otros basados en Chromium | Manifest V3. Tiendas: Chrome Web Store y Edge Add-ons |
| 2 | Firefox | Manifest V3 con `background.scripts`, porque Firefox no admite `service_worker`. Tienda: Firefox Add-ons |
| 3 | Safari | Requiere convertir la extensión con Xcode, un Mac y una cuenta de desarrollador de Apple de pago. Verificar los requisitos al llegar a esta etapa |

## Cómo hacerlo compatible desde el inicio

- **Un solo manifest con las dos claves de background**, para cubrir todos los navegadores (patrón de la documentación de MDN):

```json
"background": {
  "scripts": ["background.js"],
  "service_worker": "background.js"
}
```

  Chrome usa `service_worker`; Firefox usa `scripts`; Safari admite ambas. Chrome anterior a la versión 121 rechaza un manifest que incluya `scripts`; desde la 121 simplemente lo ignora.
- **No depender de APIs exclusivas de un navegador.** Usar solo APIs estándar y una capa de compatibilidad para el espacio de nombres (`browser.*` en Firefox, `chrome.*` en Chromium).
- **La interceptación inyecta código en la página.** Es un método que existe en todos los navegadores, pero la forma exacta y el momento de la inyección pueden variar. Probarlo en cada uno antes de dar por buena una versión. Los resultados en Chromium están en la sección *Prototipo de interceptación*; Firefox está sin probar.
- **El diseño no usa nada propio de un navegador:** mismo tamaño máximo (800 × 600) y misma interfaz en todos.

# Notas técnicas iniciales

- La extensión usa Manifest V3, con `background.scripts` y `background.service_worker` a la vez (ver *Navegadores objetivo*).
- En Manifest V3, las reglas de red declarativas no permiten reescribir el body de la respuesta. La forma habitual es inyectar un script en la página que envuelva `fetch` y `XMLHttpRequest`.
- **Record** puede usar ese mismo script para registrar las llamadas, sin pedir permisos extra.
- Las reglas se guardan localmente con `chrome.storage.local`, bajo dos claves: `store` (versión, pausa global, reglas y ajustes) y `stats` (usos por regla).
- Una regla con errores (estado fuera de 200–599, regex inválida, cabecera inválida, sin URL) **nunca se aplica**: evita que `new Response()` lance una excepción y rompa la página.
- Permisos mínimos: `storage` y acceso a los sitios donde se use. Evitar pedir permisos de más para facilitar la aprobación en las tiendas.

## Modelo de una regla

```json
{
  "id": "rule_001",
  "label": "Lista de usuarios vacía",
  "enabled": true,
  "type": "mock",
  "match": {
    "method": "GET",
    "url": "https://api.ejemplo.com/users",
    "isRegex": false
  },
  "response": {
    "status": 200,
    "delayMs": 1500,
    "headers": { "Content-Type": "application/json" },
    "body": "{ \"users\": [] }"
  },
  "notes": ""
}
```

Los usos (`hits`) **no** forman parte de la regla: se guardan aparte en `stats` (`{ "<id de regla>": número }`), para que contar no reescriba las reglas ni aparezcan en las exportaciones.

## Formato del archivo exportado

El archivo lleva un número de versión para que las versiones futuras de Stubgate puedan leer archivos antiguos. El orden del array es el orden de la lista (el de arriba tiene prioridad).

```json
{
  "app": "stubgate",
  "version": 1,
  "exportedAt": "2026-11-23T21:55:00-05:00",
  "rules": [
    { "id": "rule_001", "label": "user-profile", "enabled": true, "type": "mock" }
  ]
}
```

# Proyecto real (extension/)

Construido con WXT 0.21 + React 19 + TypeScript + Vitest. Ver `extension/README.md` para los comandos.

## Estado de la versión 1 (hito 1, MVP)

| Pieza | Estado |
|---|---|
| Núcleo (reglas, coincidencia, validación, migración, contador) | Hecho, 46 tests |
| Interceptación `fetch` + `XMLHttpRequest` (MAIN world) | Hecho, probado en Chromium |
| Puente y segundo plano | Hecho |
| Popup: lista, editor con autoguardado, pausa global, prioridad, duplicar, eliminar, import/export, idioma | Hecho |
| Pruebas de extremo a extremo con el build real | Hecho: 19/19 interceptación, 10/10 popup |
| Firefox | Compila como MV3 (con `host_permissions` e ID provisional); **sin probar en un Firefox real** |
| Safari | No iniciado |
| Record, estados del ícono, onboarding, Settings completo, «Enabled sites» (restricción opcional por sitio) | Pendiente |

## Decisiones tomadas al construir

- **Firefox se compila como MV3** (`--mv3`): en MV2 `world: "MAIN"` no existe. Requiere `host_permissions`, `browser_specific_settings.gecko.id` (hoy un valor provisional que hay que cambiar antes de publicar, porque no puede cambiar después) y `data_collection_permissions`.
- **La inyección está aislada en un solo archivo** (`entrypoints/inject.content.ts`): si Firefox o Safari necesitan otro método, solo cambia ese archivo.
- **Los textos son diccionarios propios** (`ui/i18n.ts`), porque `chrome.i18n` no permite cambiar de idioma en caliente. «Automático» sigue el idioma del navegador.
- **El popup guarda cada cambio al instante** (el popup puede cerrarse en cualquier momento) con una cola de escrituras.
- **Importar** crea ids nuevos y limpia los datos con la misma función que el almacenamiento; nunca pisa reglas existentes.
- Las fuentes Inter y JetBrains Mono van incluidas en la extensión (`@fontsource`), porque no puede cargar fuentes de Google.
- Una fila de cabecera vacía se ignora al aplicar la regla (no la invalida).
