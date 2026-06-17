Estamos en el proyecto activo `unatomo` en `C:\proyectos\unatomo`.

Antes de tocar código, lee:
- `AGENTS.md`
- `docs/CODEX_CONTEXT.md`
- `docs/DASHBOARD_MODEL.md`
- `docs/FIREBASE_MODEL.md`
- `docs/PRODUCT_NOTES.md`
- `docs/DEPLOY_NOTES.md` si vamos a publicar o diagnosticar deploy/build

Contexto importante:
- La app principal es `unatomo.com/nfc`, dashboard de máquinas con Firebase.
- El usuario suele probar cambios locales en Microsoft Edge y publicados en Chrome.
- No dejes scripts temporales/admin en el repo.
- No reviertas cambios no tuyos.
- UI bilingüe ES/EN donde corresponda.
- `superadmin` es la UI visible solo para la cuenta propietaria; violeta `#7c3aed` reservado solo para señales superadmin.
- El registro global está en `#/registro` y debe alimentarse del historial real de cada máquina.
- Las notas de producto no son reglas duras, pero orientan el enfoque: Unatomo como verdad operativa por máquina, incidencias separadas de tareas, fotos rápidas desde móvil, registro como bandeja operativa, evitar chat tipo WhatsApp.

Trabaja con cambios pequeños, lee el módulo relevante antes de editar, valida con:
`node scripts\syntax-scan.mjs static\js`
`npm.cmd run build`

Cuando estés listo, dime qué entendiste del estado actual antes de implementar cambios.
