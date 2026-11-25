# Stubgate

![Logo de Stubgate](assets/logo/stubgate-logo.svg)

Extensión de navegador para simular y modificar respuestas HTTP sin salir del navegador: cambia el cuerpo, las cabeceras y el código de estado, añade retrasos y organiza las reglas. Pensada para Chrome, Edge y Firefox (Safari más adelante).

**Estado:** versión 1 (MVP) en desarrollo. Ver [docs/History_user01.md](docs/History_user01.md).

## Guías (cada una en su archivo)

| Quiero… | Leer |
|---|---|
| Instalar y ejecutar el proyecto | [docs/guias/levantar.md](docs/guias/levantar.md) |
| Probarlo | [docs/guias/probar.md](docs/guias/probar.md) |
| Publicarlo en las tiendas | [docs/guias/publicar.md](docs/guias/publicar.md) |

## Documentación

| Documento | Contenido |
|---|---|
| [docs/01-producto.md](docs/01-producto.md) | Qué es, objetivo, alcance por hitos, hoja de ruta, planes futuros |
| [docs/02-diseno-interfaz.md](docs/02-diseno-interfaz.md) | Pantallas, dimensiones y estado del diseño |
| [docs/03-identidad-visual.md](docs/03-identidad-visual.md) | Nombre, logo, paleta, tipografía, modo claro |
| [docs/04-idioma.md](docs/04-idioma.md) | Español e inglés |
| [docs/05-arquitectura.md](docs/05-arquitectura.md) | Capas, navegadores, notas técnicas, decisiones |
| [docs/06-prototipo-interceptacion.md](docs/06-prototipo-interceptacion.md) | Pruebas previas del método de interceptación |
| [docs/History_user01.md](docs/History_user01.md) | Grupos funcionales desarrollados e historias de usuario |

## Estructura

```
stubgate/
├── README.md                  este índice
├── docs/                      documentación (un tema por archivo)
│   ├── 01 … 06-*.md
│   ├── History_user01.md
│   └── guias/                 levantar.md, probar.md, publicar.md
├── assets/                    recursos
│   ├── logo/                  logo e íconos (SVG y PNG 16/32/48/128)
│   ├── ui/                    pantallas 01–08 (PNG) y src/ con el HTML editable
│   ├── store/                 ícono y capturas para las tiendas
│   └── tools/                 scripts que regeneran las pantallas (build_ui.py, build_dims.py, measure.py)
├── extension/                 el código (WXT + React + TypeScript)
└── prototype/                 prueba previa de interceptación (histórico)
```
