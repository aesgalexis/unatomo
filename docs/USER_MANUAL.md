# Manual de usuario de Unatomo

## Objetivo

Este documento guía la elaboración y el mantenimiento del manual de usuario
integrado en `unatomo/nfc`. El manual explica el producto visible para clientes
y usuarios operativos. No debe mencionar el panel de control, `superadmin`,
herramientas internas, copias de seguridad ni operaciones de producción.

## Rutas locales

- Página directa en español: `/nfc/es/ayuda.html`
- Página directa en inglés: `/nfc/en/help.html`
- Español: `/nfc/es/index.html#/ayuda`
- Inglés: `/nfc/en/index.html#/help`
- Capítulo concreto: añadir `?capitulo=<id>` al hash, por ejemplo
  `/nfc/es/index.html#/ayuda?capitulo=qr-nfc`.

Las rutas están implementadas pero deliberadamente no están enlazadas desde
menús, Configuración ni otras páginas públicas. Las páginas directas permiten
revisar el manual sin iniciar sesión; las rutas de dashboard mantienen el
manual dentro de la sesión del usuario.

## Fuente del contenido

El contenido bilingüe vive en:

- `static/js/dashboard/views/help/helpContent.js`

La presentación y navegación viven en:

- `static/js/dashboard/views/help/helpView.js`
- `static/css/sections.css`

Cada capítulo tiene un `id` estable, título en español e inglés, introducción y
uno o varios bloques compatibles: `items`, `bullets`, `steps` y `note`.

## Alcance de la primera versión

1. Primeros pasos.
2. Dashboard y organización.
3. Ficha de una máquina.
4. Estados e incidencias.
5. Tareas.
6. Documentos y galería.
7. Usuarios y permisos.
8. Tags NFC y códigos QR.
9. Registro y estadísticas.
10. Configuración y notificaciones.
11. Uso desde el móvil.
12. Preguntas frecuentes.

## Reglas editoriales

- Escribir para una persona que usa el producto, no para quien lo desarrolla.
- Usar frases breves, verbos de acción y nombres visibles en la interfaz.
- Mantener español e inglés equivalentes en intención y detalle.
- Describir únicamente comportamiento desplegado y verificable.
- No prometer funciones futuras ni exponer detalles de Firebase o arquitectura.
- Explicar los límites que evitan pérdida de datos o accesos incorrectos.
- Evitar datos reales, correos, nombres de clientes y capturas de producción.
- Conservar los identificadores de capítulo para no romper enlaces profundos.

## Comportamiento adaptable

Desde 1280 px se muestra un árbol lateral fijo con todos los capítulos. Por
debajo de ese ancho el árbol desaparece y se ofrece un selector de capítulo
sobre el contenido. El manual debe seguir siendo completamente legible sin
JavaScript adicional de observación o estado persistente.

## Validación mínima tras un cambio

1. Ejecutar `node scripts/syntax-scan.mjs static/js/dashboard`.
2. Ejecutar `npm.cmd run check:nfc:architecture`.
3. Ejecutar `npm.cmd run lint:links`.
4. Ejecutar `npm.cmd run build` una vez por conjunto coherente de cambios.
5. Revisar español e inglés a 1440 px, 1024 px y 390 px.
6. Comprobar navegación por teclado, selector compacto y enlaces profundos.

No es necesario publicar ni desplegar para actualizar el manual localmente.
