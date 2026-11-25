# Stubgate

![Logo de Stubgate](../assets/logo/stubgate-logo.svg)

> Simula y modifica peticiones HTTP sin salir del navegador.

## Descripción

**Stubgate** es una extensión de navegador que permite interceptar llamadas a APIs y devolver la respuesta que tú quieras. En lugar de montar un backend falso, Stubgate intercepta la petición real y la reemplaza o modifica al vuelo.

## Objetivo

Que cualquier desarrollador pueda probar, desarrollar y demostrar una aplicación web sin depender de que el backend esté listo, y sin tocar el servidor.

## Qué hace (versión 1)

| Función | Descripción |
|---|---|
| Interceptar peticiones | Detecta llamadas a APIs (fetch y XHR) que coincidan con una regla |
| Modificar el body | Cambia los datos de la respuesta (JSON, texto) |
| Modificar headers | Agrega, edita o elimina headers de la respuesta |
| Cambiar el status code | Simula 200, 404, 500, etc. |
| Retrasar peticiones | Añade un delay individual por regla para simular latencia |
| Organizar reglas | Activar/desactivar, buscar, duplicar y eliminar reglas |
| Grabar peticiones | Captura las llamadas de la página y las convierte en reglas (hito 3, ver «Alcance por hitos» más abajo) |
| Pausa global | Apaga y enciende todas las reglas a la vez sin perderlas |
| Importar / Exportar | Guarda todas las reglas en un archivo `.json` y las vuelve a cargar |
| Limpiar caché | Borra los datos temporales sin tocar las reglas |
| Duplicar y reordenar | Duplica una regla y la sube o baja en la lista |

## Qué NO hace (por ahora)

- Reemplazar documentos completos (HTML, CSS, imágenes).
- Sincronizar reglas entre equipos.
- Generar datos aleatorios.
- Modificar la petición saliente (request headers y payload).
- Editar la respuesta con JavaScript personalizado.
- Depurar con breakpoints.

## Para quién

- Desarrolladores frontend bloqueados por un backend incompleto.
- QA que necesita reproducir errores y casos límite (500, timeout, lista vacía).
- Quien necesita hacer demos estables sin depender de un servidor.

## Ejemplo de uso

1. Creas una regla: `GET https://api.ejemplo.com/users`
2. Defines la respuesta: status `200`, body `{ "users": [] }`, delay `1500 ms`
3. Activas la regla y recargas la página.
4. La app recibe tu respuesta simulada, no la del servidor real.

---

# Alcance por hitos

La v1 completa es grande. Para llegar pronto a algo que funcione, se construye en hitos, y cada uno termina con algo que se puede probar.

| Hito | Qué incluye | Pantallas | Estado |
|---|---|---|---|
| **0. Prototipo** | Comprobar que la interceptación funciona (fetch, XHR, iframes, carga inicial, CSP) | Sin interfaz | Hecho en Chromium. Falta probarlo en Firefox |
| **1. MVP** | Crear, editar y borrar reglas. Coincidencia por URL (exacta o regex) y método. Respuesta simulada con status, body, headers y delay. Interruptor por regla, pausa global, guardado local y contador de usos. Al terminar, probarlo en Firefox | 01, 03, 05 y 07 | Pendiente |
| **2. v1** | Import y Export, Clear cache, búsqueda, Duplicate y Move to top/bottom, Settings (idioma y tema), estado vacío, estados de error, ícono activo/pausado e interfaz completa en español | 02, 04, 06 y las pendientes | Pendiente |
| **3. Publicación y ampliaciones** | Record, Enabled sites (restricción opcional), abrir en pestaña nueva o ventana flotante, ficha y revisión en las tiendas (primero Chrome Web Store y Edge Add-ons) | Pendientes | Pendiente |
| **Después** | Publicar en Firefox Add-ons y Safari, modificar la petición saliente, JavaScript personalizado, breakpoints, colecciones, equipos y funciones de pago | | Hoja de ruta |

**Cuándo está terminado el MVP:** una persona instala la extensión, crea una regla para una URL de su aplicación, ve la respuesta simulada en su página, la pausa con el interruptor global y, al cerrar y abrir el navegador, sus reglas siguen ahí.

**Fuera del MVP a propósito:** Record es lo más pesado (hay que capturar también el cuerpo de las respuestas) y Enabled sites (restringir Stubgate a ciertos sitios) es opcional, porque la extensión ya funciona en cualquier sitio `http` o `https` y es la regla quien decide dónde se aplica. Ninguno de los dos bloquea el valor principal.

---

# Hoja de ruta (después de la v1)

- Modificar la petición saliente (headers y payload).
- Tipo de regla **Modify**: editar la respuesta real en lugar de reemplazarla.
- Colecciones y la opción *Move to collection*.
- Sitios habilitados (*Enabled sites*): restricción opcional por sitio; por defecto actúa en cualquier sitio.
- Abrir el panel en ventana flotante o en pestaña nueva.
- Datos de prueba aleatorios.
- Breakpoints y logs de peticiones.
- Colecciones, variables globales y trabajo en equipo.
- Edición de respuestas con JavaScript personalizado.
- Modo claro.

---

# Planes y suscripción (a futuro)

> En el futuro Stubgate tendrá un **plan de pago por suscripción**. No se construye ahora, pero el diseño y la arquitectura de la v1 deben dejar la puerta abierta para no tener que rehacer nada después.

## Qué se decide desde ahora (sin costo)

1. **Un solo punto de control.** Cada función consulta `can("nombre-de-la-función")`. Hoy devuelve siempre `true`; más adelante leerá el plan de la persona.
2. **El plan vive en los ajustes.** Un campo `plan` (`"free"` por defecto) y un objeto `limits` (por ejemplo, número máximo de reglas; `null` significa sin límite).
3. **Datos extensibles.** El modelo de regla y el archivo exportado (que lleva `version`) admiten campos nuevos, como `collectionId`, sin romper lo que ya existe.
4. **Todo en local.** Las reglas no dependen de una cuenta. Más adelante la cuenta solo servirá para validar el plan.

## Espacio reservado en la interfaz

- **Etiqueta PRO:** un componente pequeño (color violeta propuesto, `#A78BFA`) para marcar funciones de pago, y un estado "bloqueado" para opciones de menú, pestañas y botones. En la v1 no se muestra en ninguna parte.
- **Settings:** reservar una sección *Account & plan* cuando se diseñe esa pantalla.
- **Aviso de mejora (upgrade):** un diálogo corto para cuando alguien toque una función bloqueada. Se diseña cuando se defina el plan.
- **Los menús ya están pensados para crecer.** Por ejemplo, *Move to collection* encajaría en el menú de la regla (pantalla 05).

## Cuando llegue el momento

- Hará falta un sistema de cuentas y un proveedor de pagos externo (como Stripe o Paddle). La Chrome Web Store ya no ofrece pagos propios para extensiones, aunque conviene verificarlo entonces.
- Habrá que actualizar la política de privacidad y los permisos: validar el plan implica conexiones a internet que la v1 no tiene.
- Hay que decidir qué funciones serán de pago. Candidatas de la hoja de ruta: modificar la petición saliente, JavaScript personalizado, breakpoints, colecciones, datos aleatorios y trabajo en equipo.
- **Recomendación:** lo que se publique gratis en la v1 debería seguir siendo gratis. Quitar funciones a quien ya las usa genera rechazo; es mejor poner el valor de pago en funciones nuevas.

---
