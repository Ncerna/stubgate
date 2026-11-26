# Historias de usuario: Stubgate

Registro de **qué grupos funcionales ya están desarrollados** y de qué historias de usuario los cubren. Sirve para ver, más adelante, qué se hizo y qué falta.

- **Estado a:** 25 de noviembre de 2026 (hito 1, MVP, en curso)
- **Usuario tipo:** persona desarrolladora que trabaja con una interfaz web y necesita simular las respuestas de una API sin tocar el servidor.
- **Cómo leerlo:** cada grupo tiene su estado, sus historias (`HU-xx`) con criterios de aceptación y la evidencia que las respalda.

| Estado | Significado |
|---|---|
| ✅ Hecho | Implementado y probado |
| 🟡 Parcial | Funciona, pero falta una parte (se indica cuál) |
| ⬜ Pendiente | Diseñado o previsto, sin construir |

## Resumen por grupos funcionales

| # | Grupo funcional | Estado | Historias |
|---|---|---|---|
| G1 | Gestión de reglas | ✅ Hecho | HU-01 a HU-06 |
| G2 | Coincidencia de peticiones | ✅ Hecho | HU-07 a HU-09 |
| G3 | Respuesta simulada | ✅ Hecho | HU-10 a HU-13 |
| G4 | Interceptación en la página | ✅ Hecho (Chromium) | HU-14 a HU-17, HU-37 |
| G5 | Control global | ✅ Hecho | HU-18 |
| G6 | Contador de usos | ✅ Hecho | HU-19 |
| G7 | Validación y robustez | ✅ Hecho | HU-20 a HU-22 |
| G8 | Importar y exportar | ✅ Hecho | HU-23, HU-24, HU-24b |
| G9 | Idioma y apariencia | ✅ Hecho (modo claro por revisar) | HU-25, HU-26 |
| G10 | Compatibilidad entre navegadores | 🟡 Parcial | HU-27 a HU-29 |
| G11 | Calidad y pruebas | ✅ Hecho | HU-30 |
| G12 | Restringir por sitio (Enabled sites, opcional) | ⬜ Pendiente | HU-31 |
| G13 | Grabar llamadas (Record) | ⬜ Pendiente | HU-32 |
| G14 | Barra de herramientas y menús | 🟡 Parcial | HU-33 |
| G15 | Estado en el ícono de la barra | ⬜ Pendiente | HU-34 |
| G16 | Primer uso y permisos (onboarding) | ⬜ Pendiente | HU-35 |
| G17 | Planes y suscripción | ⬜ Pendiente | HU-36 |

---

## G1. Gestión de reglas ✅

**Qué cubre:** crear, editar, ordenar y organizar las reglas desde el panel, tal como se aprobó en el diseño (pantallas 01, 03 y 05).
**Dónde está:** `extension/src/entrypoints/popup/` (`App.tsx`, `RuleRow.tsx`, `CodeEditor.tsx`) y `src/core/rules.ts`.

**HU-01. Crear una regla.** Como persona desarrolladora, quiero crear una regla nueva para responder una petición con mi propia respuesta.
- El botón «+» crea la regla arriba de la lista, expandida y marcada `draft` hasta que tiene URL (GET, estado 200, cabecera `Content-Type: application/json`, cuerpo `{ "message": "OK", "data": [] }`).
- El campo de URL recibe el foco; el contador de la pestaña *Rules* sube.
- Al pegar un comando **cURL** en el campo de URL se rellenan la URL y el método. *(La documentación original decía también las cabeceras; no se copian porque las cabeceras de la petición no son las de la respuesta.)*

**HU-02. Editar con autoguardado.** Quiero que mis cambios se guarden solos.
- Cada cambio se guarda al instante; el pie del editor dice «Saved automatically».
- Editor de la regla con URL (y botón `.*` de regex), método, código de estado (con el texto estándar y atajos 200, 201, 204, 400, 401, 403, 404, 429, 500, 503), retraso, etiqueta, tipo de regla (solo *Mock*), y pestañas *Response body*, *Response headers* (con contador) y *Notes*.
- El cuerpo tiene números de línea, colores para JSON, y herramientas para formatear, compactar y copiar.

**HU-03. Activar y desactivar una regla.** Quiero apagar una regla sin borrarla.
- Cada fila tiene su interruptor; una regla desactivada se ve atenuada y no se aplica.

**HU-04. Cambiar la prioridad.** Quiero decidir qué regla gana cuando varias coinciden.
- El menú ⋮ de la regla ofrece *Move to top* y *Move to bottom* (atajos `T` y `B`); la opción se atenúa si ya está en ese extremo.

**HU-05. Menú de la regla.** Quiero duplicar, mover y eliminar desde la propia fila.
- El menú ⋮ tiene *Delete* (`D`, en rojo), *Duplicate* (`C`), *Move to top* (`T`) y *Move to bottom* (`B`); con el menú abierto, pulsar la letra ejecuta la acción.
- *Duplicate* crea la copia justo debajo, con el nombre terminado en «copy», **desactivada**.

**HU-06. Buscar reglas.** Quiero encontrar una regla entre muchas.
- El botón de lupa abre una barra de búsqueda que filtra por nombre, URL, método y etiqueta.
- Sin coincidencias se muestra un mensaje; sin reglas, un estado vacío con la acción de crear.

**Evidencia:** 70 tests unitarios (incluidos `rules.test.ts` y `curl.test.ts`) y 26 comprobaciones del panel real en `e2e/popup.py`; capturas `e2e/real-*.png`.

---

## G2. Coincidencia de peticiones ✅

**Qué cubre:** decidir qué regla responde a cada petición.
**Dónde está:** `extension/src/core/match.ts`.

**HU-07. Coincidencia por URL exacta y método.** Quiero que una regla solo responda a la URL y el método que indiqué.
- `https://api.com` y `https://api.com/` se tratan como la misma URL.
- Una URL con parámetros distintos no coincide con una regla de URL exacta.
- El método `ANY` coincide con cualquiera, sin distinguir mayúsculas.

**HU-08. Coincidencia por expresión regular.** Quiero cubrir familias de URL (por ejemplo `/customers/\d+$`).
- Con «Regex» activado, la URL se evalúa como expresión regular.
- Una regex inválida no rompe nada: la regla se ignora y se avisa en el editor.

**HU-09. Gana la primera regla.** Quiero un orden de prioridad predecible.
- Si dos reglas coinciden, responde la que está más arriba.
- Las reglas desactivadas o con errores no participan.

**Evidencia:** 9 tests en `match.test.ts`.

---

## G3. Respuesta simulada ✅

**Qué cubre:** qué devuelve la regla.
**Dónde está:** `extension/src/core/response.ts`, `RuleEditor.tsx`.

**HU-10. Código de estado.** Quiero simular éxitos y errores (200, 404, 500…).
- Acepta enteros de 200 a 599 y muestra al lado el texto estándar (200 → OK).
- Fuera de ese rango, el editor muestra el error y la regla no se aplica.

**HU-11. Cuerpo de la respuesta.** Quiero definir el contenido exacto que recibe mi aplicación.
- Indica si el cuerpo es JSON válido, no válido o está vacío.
- Un JSON roto se puede guardar a propósito, para simular una API defectuosa.
- «Formatear JSON» da formato al cuerpo cuando es válido.
- Con los estados 204, 205 y 304 la respuesta sale sin cuerpo, como exige la plataforma.

**HU-12. Cabeceras de la respuesta.** Quiero controlar las cabeceras (tipo de contenido, valores propios).
- Se pueden añadir y quitar filas de cabecera.
- Una fila vacía recién añadida se ignora y no invalida la regla.

**HU-13. Retraso.** Quiero simular una API lenta.
- Retraso en milisegundos, de 0 a 60 000, por regla.
- Comprobado en el navegador: una regla de 600 ms tarda al menos 550 ms.

**Evidencia:** `response.test.ts`, `validate.test.ts`, pruebas de extremo a extremo (retraso y 204).

---

## G4. Interceptación en la página ✅ (comprobado en Chromium)

**Qué cubre:** hacer que la página reciba la respuesta simulada en lugar de la real.
**Dónde está:** `extension/src/page/intercept.ts`, `entrypoints/inject.content.ts`, `bridge.content.ts`.

**HU-14. Simular `fetch` y `XMLHttpRequest`.** Quiero que mi aplicación reciba la respuesta simulada sin cambiar su código.
- Funciona con `fetch` (estado, cabeceras, cuerpo y `url` de la respuesta) y con `XMLHttpRequest`, incluido `responseType: 'json'`.
- Una petición cancelada (`AbortSignal` o `abort()`) no recibe la respuesta simulada (implementado, *sin prueba automática todavía*).

**HU-15. La primera petición no se escapa.** Quiero que mi página no use datos reales por haber llamado demasiado pronto.
- La petición que se lanza al arrancar la página ya sale simulada.
- Tras recargar, sigue ocurriendo con las reglas guardadas.

**HU-16. Iframes y otros dominios.** Quiero que funcione también en iframes y en APIs de otro origen.
- Las peticiones dentro de un iframe se simulan.
- Una API en otro origen (otro host o puerto) se simula.

**HU-17. Los cambios se aplican sin recargar.** Quiero editar una regla y probarla de inmediato.
- Al editar desde el panel, la página abierta usa la regla nueva sin recargar.

**HU-37. Funciona en cualquier sitio web.** Quiero usar Stubgate en cualquier página y que solo actúe donde una regla coincide.
- Actúa en todas las páginas `http` y `https`, en todos los marcos, incluidos los `about:blank` y `srcdoc` creados por la página.
- Una página sin regla que coincida no se modifica: la petición llega al servidor real.
- Los patrones están definidos en un solo archivo (`src/platform/matches.ts`).
- No cubre `file://`, `ftp://` ni las páginas internas del navegador.

**Límite conocido:** los *web workers* no se interceptan.
**Evidencia:** 19 comprobaciones de extremo a extremo en `e2e/run.py`; prototipo en `prototype/`.

---

## G5. Control global ✅

**HU-18. Pausar todas las reglas.** Quiero que mi aplicación hable con el servidor real un momento sin perder mis reglas.
- Un interruptor en la cabecera pausa todo; la etiqueta pasa a «En pausa» y la lista se atenúa.
- Con la pausa activa responde el servidor real; al reanudar vuelven las reglas.

**Evidencia:** pruebas de extremo a extremo (pausa desde el almacenamiento y desde el panel).

---

## G6. Contador de usos ✅

**Dónde está:** `extension/src/core/hits.ts`, `background.ts`.

**HU-19. Ver cuántas veces respondió cada regla.** Quiero saber si una regla realmente se está usando.
- Cada fila muestra «N usos».
- Los usos se guardan aparte de las reglas, de modo que contar no reescribe las reglas ni sale en las exportaciones.
- Muchas peticiones simultáneas no pierden cuentas (se acumulan y se guardan por lotes); si una escritura falla, se reintenta.

**Límite conocido:** si el service worker se detiene con usos sin guardar, puede perderse el último lote (menos de 0,4 s).
**Evidencia:** `hits.test.ts` (3 tests) y la comprobación de extremo a extremo.

---

## G7. Validación y robustez ✅

**Dónde está:** `extension/src/core/validate.ts`, `migrate.ts`.

**HU-20. Una regla con errores no rompe mi página.** Quiero que un error de configuración no tumbe mi aplicación.
- Una regla con estado inválido, regex inválida, cabecera inválida o sin URL **nunca se aplica**.
- En la lista aparece marcada con «No se aplica: la regla tiene errores».

**HU-21. Errores claros al editar.** Quiero saber qué corregir.
- Cada error aparece junto al campo, en el idioma elegido.

**HU-22. Mis datos sobreviven a datos dañados o de versiones antiguas.** Quiero no perder el trabajo por un formato viejo o un valor corrupto.
- Lo que hay en el almacenamiento se limpia siempre al leerlo: valores de tipo incorrecto se reemplazan por los de por defecto, y las reglas sin id se descartan.
- Los datos llevan número de versión para futuras migraciones.

**Evidencia:** `validate.test.ts` y `migrate.test.ts`.

---

## G8. Importar y exportar ✅

**Dónde está:** menú ⋮ de la barra; lógica en `extension/src/core/importExport.ts`.

**HU-23. Exportar mis reglas.** Quiero guardar mis reglas en un archivo y compartirlas.
- *Export* descarga de inmediato `stubgate-rules-AAAA-MM-DD.json` con `app`, `version`, `exportedAt` y las reglas, sin pedir confirmación, y avisa con un mensaje breve con el número de reglas y el nombre del archivo.

**HU-24. Importar reglas.** Quiero cargar reglas desde un archivo.
- Un diálogo muestra el nombre del archivo y cuántas reglas trae, con dos modos: **Add to existing rules** (las agrega arriba; si un nombre se repite, se renombra «nombre (2)») y **Replace all rules**.
- Las reglas importadas siempre reciben ids nuevos y se limpian como los datos guardados.
- Un archivo que no es de Stubgate muestra un error y no cambia nada.

**HU-24b. Limpiar la caché.** Quiero borrar los datos temporales sin perder mis reglas.
- *Clear cache* pide confirmación y, hoy, reinicia los contadores de uso. Las reglas no se borran. Cuando exista *Record*, también borrará las peticiones grabadas.

**Evidencia:** `importExport.test.ts` y las comprobaciones de exportar, importar (ambos modos y archivo inválido) en `e2e/popup.py`.

---

## G9. Idioma y apariencia ✅

**HU-25. Elegir el idioma.** Quiero usar la extensión en español o en inglés.
- En «Settings» (botón de ajustes) hay un selector con Automático, English y Español; Automático sigue el idioma del navegador. El cambio se aplica al momento en todo el panel.
- Comprobado en español el panel, el editor y los ajustes (sin textos cortados).

**HU-26. Modo oscuro y claro.** Quiero que se vea bien en mi tema.
- «Settings» tiene un selector de tema (oscuro o claro) que se aplica al momento y se guarda.
- *Falta:* revisar el modo claro pantalla por pantalla (los colores claros están definidos, pero la maqueta aprobada solo existe en oscuro).

---

## G10. Compatibilidad entre navegadores 🟡

**HU-27. Usar Stubgate en Chrome.** ✅ Compila como Manifest V3 con los iconos y el popup de 800 × 600, y se probó en Chromium.

**HU-28. Usar Stubgate en Firefox.** 🟡 Compila como MV3 con `host_permissions`, `data_collection_permissions` y `background.scripts`.
- *Falta:* probarlo en un Firefox real (el resultado del prototipo no se recibió) y poner un ID definitivo (hoy es un valor provisional).

**HU-29. Usar Stubgate en Safari.** ⬜ No iniciado.

---

## G11. Calidad y pruebas ✅

**HU-30. Poder cambiar el código con confianza.**
- 70 tests unitarios del núcleo (`npm test`).
- Comprobación de tipos sin errores (`npm run typecheck`).
- Pruebas de extremo a extremo con el build real en Chromium: 19 de interceptación y 26 del panel.
- La forma de inyección está aislada en un solo archivo para cambiarla por navegador.

---

## Grupos pendientes (para ver qué falta)

**G12. Restringir por sitio (Enabled sites, opcional)** ⬜
**HU-31.** Si lo necesito, quiero limitar Stubgate a los sitios que yo elija. *No es necesario para el MVP:* por decisión de producto la extensión funciona en cualquier sitio y es la regla quien decide dónde se aplica (HU-37). Esta función solo añadiría una restricción opcional desde el menú More.

**G13. Grabar llamadas (Record)** ⬜
**HU-32.** Quiero capturar las llamadas reales y convertirlas en reglas con un clic.

**G14. Barra de herramientas y menús** 🟡
**HU-33.** Quiero la barra de 8 funciones del diseño (pantallas 01, 02, 04, 05 y 06).
- *Hecho:* búsqueda, eliminar (todas o solo las desactivadas, con confirmación), interruptor global (con aviso ámbar «Interception paused…» y barra de estado), nueva regla, ajustes, menú ⋮ (Import, Export, Clear cache) y diálogos de la pantalla 06.
- *Pendiente:* el botón **Record** y el menú **☰** están en la barra pero desactivados («próximamente»): Record es el grupo G13 y el contenido de ☰ aún no está diseñado.
- *Nota:* el botón de compactar del editor (`⇅`) compacta el JSON en una línea; plegar líneas no se implementó.

**G15. Estado en el ícono de la barra** ⬜
**HU-34.** Quiero ver en el ícono si Stubgate está activo, en pausa o respondiendo.

**G16. Primer uso y permisos** ⬜
**HU-35.** Quiero entender qué hace la extensión y qué permisos usa la primera vez que la abro.

**G17. Planes y suscripción** ⬜
**HU-36.** Como producto, quiero cobrar por un plan en el futuro sin rehacer la extensión. *Previsto:* la función `can()`, la etiqueta PRO y el campo de plan. *Hoy:* aún no está en el código, solo en el diseño.

---

## Cómo mantener este archivo

- Al terminar una funcionalidad, cambiar el estado del grupo y marcar sus historias.
- Una historia solo se marca ✅ cuando tiene evidencia: un test o una comprobación en el navegador.
- Las historias nuevas siguen la numeración (`HU-37`, …) y se agregan al grupo que corresponda o a un grupo nuevo.
