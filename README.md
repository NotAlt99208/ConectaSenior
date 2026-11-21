# ConectaSenior · Landing Page

Landing Page responsive de **ConectaSenior**, una solución para que las personas mayores completen sus trámites digitales por sí mismas, con acompañamiento familiar opcional y apoyo del personal de los centros de atención.

Proyecto del curso **HCI for UX Design (1ASI0784)** · UPC · Ciclo 2026-20.

- **Sitio publicado:** https://notalt99208.github.io/ConectaSenior/
- **Tecnologías:** HTML5 semántico, CSS3 (variables con la guía de estilos) y JavaScript sin frameworks. Los datos son simulados y se guardan en el `localStorage` del navegador.

## Estructura

```
├── index.html        Cómo funciona: demo con subtítulos + "Prueba la app" con tres roles
├── resultados.html   Resultados y testimonios
├── descargar.html    Código QR de descarga con detección del sistema
├── materiales.html   Guía impresa de una página
├── solicitar.html    Formulario de información o capacitación
├── portal.html       Portal de acompañamiento: crear cuenta, iniciar sesión y panel del familiar
├── css/styles.css    Guía de estilos (paleta, tipografía, componentes, responsive, impresión)
├── js/main.js        Interacciones de las historias de usuario
└── images/qr.svg     Código QR (abre descargar.html?qr=1)
```

## Guía de estilos aplicada

| Elemento | Valor |
|---|---|
| Fondo (60 %) | Blanco Cálido `#FAF7F2` |
| Estructura (30 %) | Azul Confianza `#0B3C6F` |
| Acción y logro (10 %) | Verde Logro `#14592F` |
| Errores / acciones destructivas | Rojo Atención `#8F1616` |
| Pendientes / vencimientos | Ámbar `#FFF3CD` con texto `#5C3A00` |
| Texto | Gris Carbón `#1A1A1A` · Gris Medio `#4A4A4A` |
| Tipografía | Atkinson Hyperlegible: títulos 28, subtítulos 24, cuerpo 20, botones 22, texto secundario 16 (px) |
| Iconografía | Material Symbols Rounded, siempre con texto al lado |
| Botones | Principal 64 px de alto, mínimo 48 px y 16 px de separación |

## Historias de usuario core implementadas (30)

| Sección | HU |
|---|---|
| Prueba la app · Adulto mayor | HU01, HU02, HU03, HU04, HU05, HU06, HU07, HU14, HU15, HU17, HU18, HU20, HU21, HU24, HU25 |
| Prueba la app · Familiar y Portal de acompañamiento | HU28, HU31, HU33, HU34, HU35, HU36, HU38 |
| Prueba la app · Personal del centro | HU41, HU42, HU43 |
| Cómo funciona · Resultados · Descargar · Materiales · Solicitar | HU44, HU45, HU46, HU47, HU48 |

Además, el Portal de acompañamiento cubre HU29, HU30 y HU32 (avisos de pendientes, intentos fallidos y próximos vencimientos), y el inicio ordena los accesos según su uso (HU26).

## Accesibilidad

Enlace "Saltar al contenido", HTML semántico, etiquetas en todos los campos, mensajes de error junto al campo con `aria-invalid` y `role="alert"`, foco visible, pestañas que se manejan con las flechas del teclado, región `aria-live` para anunciar cambios, contraste AAA y estados que se comunican con color, ícono y texto. Se respeta `prefers-reduced-motion`.

## Cómo verlo en local

Abre `index.html` en el navegador o ejecuta `python3 -m http.server` en esta carpeta.
