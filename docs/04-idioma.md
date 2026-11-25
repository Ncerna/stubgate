# Idioma (Español e inglés)

La interfaz estará disponible en **español** y en **inglés**. La opción se coloca en la pantalla de **Settings** (pendiente de diseñar).

## Cómo funciona

| Aspecto | Decisión |
|---|---|
| Opciones | Español y English |
| Idioma por defecto | El del navegador. Si no es español, se usa inglés |
| Dónde se cambia | Settings, en un selector de idioma. El cambio se aplica al momento, sin reiniciar |
| Qué se traduce | Toda la interfaz: botones, etiquetas, menús, avisos, diálogos y mensajes de error |
| Qué NO se traduce | Lo que escribe la persona (nombres de reglas, URLs, JSON) y los términos técnicos que no tienen traducción, como *status code*, *header* o *delay*, que pueden quedarse en inglés |

## Qué hay que prever en el diseño

- **El español ocupa más espacio.** Los textos suelen ser entre 20 % y 30 % más largos. Por ejemplo, *Response headers* pasa a *Encabezados de respuesta*. Las pestañas, etiquetas de campos, menús y botones deben soportar textos más largos dentro del límite de 800 px.
- **Verificar cada pantalla en ambos idiomas** antes de darla por terminada. Ya se hizo con la pantalla 03 (ver «Dimensiones» en [02-diseno-interfaz.md](02-diseno-interfaz.md)); faltan las demás.
- **Ningún texto escrito a mano en el código.** Cada texto tiene una clave (por ejemplo `rule.statusCode`) y se busca en el diccionario del idioma activo.
- **Fechas y números** con el formato del idioma elegido.

## Nota técnica

- La API estándar de extensiones (`chrome.i18n`) usa siempre el idioma del navegador y **no permite cambiarlo desde dentro de la extensión**. Como Stubgate necesita un selector propio, la interfaz usará sus propios diccionarios (`en.json` y `es.json`) y guardará la elección en los ajustes.
- `chrome.i18n` se sigue usando para el **nombre y la descripción** de la extensión en la tienda (carpeta `_locales/en` y `_locales/es`).
- Dejar la estructura lista para añadir más idiomas en el futuro sin tocar el código.

---
