# Mantenimiento futuro del manual

## Cuándo actualizarlo

Actualizar el manual en el mismo conjunto de cambios cuando una modificación:

- añada, elimine o renombre una función visible;
- cambie un recorrido, permiso, límite de archivo o resultado de una acción;
- incorpore una nueva vista del dashboard;
- cambie el comportamiento del QR/NFC, las tareas o los estados;
- resuelva una pregunta frecuente de forma distinta.

Los cambios puramente internos, correcciones sin efecto observable y funciones
exclusivas de `superadmin` no requieren actualizar el manual.

## Proceso recomendado

1. Identificar el capítulo afectado en `helpContent.js`.
2. Verificar la conducta actual en la aplicación y en la documentación técnica
   correspondiente.
3. Actualizar primero el texto español y después su equivalente inglés.
4. Confirmar que ambos idiomas contienen la misma información práctica.
5. Revisar si el cambio merece una nueva pregunta frecuente o una advertencia.
6. Ejecutar las comprobaciones indicadas en `docs/USER_MANUAL.md`.

## Nuevos capítulos

Para añadir un capítulo:

1. Crear una entrada en `HELP_SECTIONS` con un `id` corto, descriptivo y estable.
2. Añadir títulos e introducciones `es` y `en`.
3. Elegir el bloque que mejor represente el contenido: definiciones, viñetas,
   pasos numerados o nota.
4. No añadir manualmente el enlace al árbol: la vista lo genera desde los datos.
5. Comprobar que el árbol no desborda una pantalla de 1280 × 720.

## Capturas e ilustraciones futuras

La primera versión es textual para reducir obsolescencia. Si se incorporan
imágenes en el futuro:

- usar datos ficticios y una cuenta de demostración;
- capturar español e inglés cuando exista texto dentro de la imagen;
- guardar los recursos bajo `static/img/help/` con nombres semánticos;
- añadir texto alternativo útil;
- recortar la imagen al control o recorrido relevante;
- revisar cada captura cuando cambie esa interfaz.

## Control de alcance

El manual público nunca debe documentar:

- acceso o funciones de `superadmin`;
- el panel de control interno;
- scripts administrativos, despliegues o copias de seguridad;
- estructura de colecciones, reglas o detalles de seguridad;
- información de clientes o datos procedentes de producción.

Si una función todavía está en transición, describir solamente el
comportamiento disponible para el usuario actual. Las decisiones futuras se
mantienen en los documentos técnicos, no en el manual.
