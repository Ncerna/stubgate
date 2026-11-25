# Cómo publicar

Esta guía explica cómo **empaquetar y enviar** Stubgate a las tiendas. Las tiendas cambian sus reglas con frecuencia: antes de enviar, confirma los requisitos vigentes en su documentación oficial (enlaces al final).

> **Estado:** Stubgate **aún no está listo para publicar**. Ver «Antes de publicar» abajo.

## Antes de publicar (pendientes)

- [ ] **Nombre verificado.** Revisar disponibilidad en las tiendas, GitHub/npm y dominios, y marcas (USPTO, EUIPO, INDECOPI). Ver [../03-identidad-visual.md](../03-identidad-visual.md).
- [ ] **ID de Firefox definitivo.** Hoy `wxt.config.ts` tiene `stubgate@example.invalid`, un valor provisional. El ID no se puede cambiar después de publicar.
- [ ] **Firefox probado en un Firefox real** (lista de [probar.md](probar.md)).
- [ ] **Justificar el acceso a todos los sitios.** Stubgate actúa en cualquier página `http` y `https` (decisión de producto: la regla decide dónde se aplica). Chrome lo muestra al instalar como acceso amplio y la revisión puede pedir una explicación. Preparar el texto: el script solo lee y responde las peticiones que coinciden con reglas que el propio usuario creó, y no envía datos fuera del navegador. Ver [../05-arquitectura.md](../05-arquitectura.md).
- [ ] **Política de privacidad.** Stubgate guarda todo en local y no envía datos; aun así, las tiendas pueden pedir una política publicada con su dirección.
- [ ] **Material de la ficha:** ver la tabla de abajo (faltan capturas y la imagen promocional).
- [ ] **Todas las pruebas en verde** y la lista manual completa ([probar.md](probar.md)).

## 1. Subir la versión

La versión sale de `extension/package.json` (campo `version`) y WXT la copia al manifest.

```bash
cd extension
npm version patch --no-git-tag-version     # 0.0.1 -> 0.0.2 (o minor / major)
```

Cada envío a una tienda necesita una versión mayor que la anterior.

## 2. Generar los paquetes

```bash
npm test && npm run typecheck
npm run zip              # Chrome / Edge:  .output/stubgate-<versión>-chrome.zip
npm run zip:firefox      # Firefox:        .output/stubgate-<versión>-firefox.zip
                         #                 .output/stubgate-<versión>-sources.zip
```

El zip de **código fuente** (`-sources.zip`) lo pide Mozilla cuando el código enviado está compilado o minificado; se sube junto al paquete de Firefox, con las instrucciones de compilación (`npm install && npm run build:firefox`).

## 3. Material de la ficha

| Recurso | Medida | Estado | Archivo |
|---|---|---|---|
| Ícono de la tienda | 128 × 128 (dibujo de 96 y 16 de margen) | Hecho | `assets/store/store-icon-128.png` |
| Capturas | 1280 × 800 o 640 × 400, de 1 a 5 | 1 de 5 | `assets/store/screenshot-1-1280x800.png` |
| Imagen promocional pequeña | 440 × 280 | Pendiente | — |
| Imagen promocional grande (opcional) | 1400 × 560 | Pendiente | — |
| Descripción corta y larga | texto, en inglés y español | Pendiente | — |

Las capturas deben hacerse con la **extensión real**, no con las maquetas, antes de enviar.

## 4. Chrome Web Store (y Edge Add-ons)

1. Crear una cuenta de desarrollador en el panel de la Chrome Web Store (tiene un pago único de registro).
2. **Nuevo elemento** → subir `stubgate-<versión>-chrome.zip`.
3. Completar la ficha: descripción, categoría, idioma, ícono y capturas.
4. En **Prácticas de privacidad**: indicar el único propósito (simular respuestas HTTP), justificar cada permiso (`storage` y el acceso a los sitios de los scripts de contenido), declarar que no se recopilan datos y enlazar la política de privacidad.
5. Enviar a revisión. El tiempo de revisión varía; si piden más información sobre los permisos, responder con la explicación de arquitectura ([../05-arquitectura.md](../05-arquitectura.md)).
6. Edge Add-ons acepta el mismo paquete de Chrome (Manifest V3) desde su propio panel de Partner Center.

## 5. Firefox (addons.mozilla.org)

1. Crear una cuenta en el portal de complementos de Firefox (es gratuito).
2. Confirmar que el ID de `wxt.config.ts` es el definitivo y que `data_collection_permissions` declara `none`.
3. **Enviar un complemento nuevo** → subir `stubgate-<versión>-firefox.zip`.
4. Cuando lo pida, subir también `stubgate-<versión>-sources.zip` con las instrucciones de compilación.
5. Elegir distribución **listada** (en el sitio de Mozilla) o **autodistribuida** (Mozilla lo firma y tú lo repartes).

## 6. Safari (a futuro, no iniciado)

Safari necesita un Mac con Xcode y una cuenta del programa de desarrolladores de Apple (de pago anual). Ruta prevista:

1. Compilar el proyecto para Chrome.
2. Convertir la carpeta con la herramienta de Apple (`xcrun safari-web-extension-converter`).
3. Compilar y firmar el proyecto de Xcode, y enviarlo por App Store Connect.

Pendiente de verificar: que Safari soporte `world: "MAIN"` en los scripts de contenido; si no, hay que cambiar solo `entrypoints/inject.content.ts` (la inyección está aislada ahí a propósito).

## 7. Después de publicar

1. Etiquetar la versión en Git (`git tag v0.0.2`).
2. Anotar en [../History_user01.md](../History_user01.md) los grupos que cambiaron.
3. Guardar los paquetes enviados (los `.zip`) junto a la etiqueta.

## Documentación oficial

- Chrome Web Store: https://developer.chrome.com/docs/webstore/publish
- Firefox: https://extensionworkshop.com/documentation/publish/
- Safari: https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari
- WXT (publicación y zips): https://wxt.dev
