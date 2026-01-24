# Arquitectura base (dashboard + NFC)

## Estructura de carpetas

```
static/
  css/
    dashboard.css        # estilos del dashboard (tarjetas + detalle)
  js/
    app/
      router.js          # parser de hash + listeners
      state.js           # mock de datos + rol
      ui.js              # render principal
      pages/
        dashboard.js     # listado
        machine.js       # detalle + tabs
    dashboard/
      index.js           # bootstrap del dashboard
```

## Rutas hash (NFC-friendly)

- Listado: `/es/index.html#/`
- Detalle de máquina: `/es/index.html#/m/<machineId>`
- Subrutas: `/es/index.html#/m/<machineId>/<tab>`
  - Tabs sugeridas: `general`, `historial`, `config`, `respaldo`

Esto evita 404 al abrir desde NFC en hosting estático.

## Modelo mínimo de datos

**Máquina**
- `id`
- `nombre`
- `modelo`
- `serie`
- `ubicacion`
- `estado` (`ok` | `parada`)
- `ultimaIntervencion`

**Etiqueta NFC**
- URL base + hash:
  - `https://dominio.com/es/index.html#/m/<id>`

## Cómo pregrabar una etiqueta

1) Elegir `id` de la máquina en `state.js`.
2) Programar la etiqueta con:

```
https://dominio.com/es/index.html#/m/<id>
```

## Evolución prevista

- Tabs con datos reales de operación y mantenimientos.
- Historial con timeline y adjuntos.
- Configuración con parámetros por rol.
- Respaldo de datos y exportaciones.
- Roles: admin, técnico, cliente, invitado.
- Integración con backend (pendiente).
