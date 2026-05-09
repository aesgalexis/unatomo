# Desarrollo

## Requisitos

- Node.js 22.12+ (recomendado) o 20.19+
- Si usas Node 24 y Vite falla, cambia a Node LTS

## Configuración Firebase (runtime)

El frontend lee la configuración de Firebase desde `static/js/config/runtime-config.js`,
que se genera automáticamente desde `.env.local` o `.env`.

1) Copia el ejemplo:

```
copy .env.example .env.local
```

2) Rellena los valores reales de Firebase en `.env.local`.

Para verificar que no haya keys filtradas:

```
npm run scan:secrets
```

## Deploy (GitHub Pages)

El workflow genera `runtime-config.js` desde secrets de GitHub.
Configura estos secrets en el repositorio:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID`

## Firebase CLI (rules/functions)

Los artefactos de Firebase viven en `firebase/`:

- Reglas: `firebase/firestore.rules`
- Índices: `firebase/firestore.indexes.json`
- Functions: `firebase/functions`

El CLI sigue leyendo `firebase.json` desde la raíz.

## Instalar

```
npm i
```

## Levantar entorno de desarrollo

```
npm run dev
```

Si `npm run dev` falla dentro de `node_modules/vite`, ejecuta:

```
npm run doctor
```

Reinstala dependencias y, si hace falta, usa Node LTS o el servidor estático:

```
npm run dev:static
```

## Probar rutas de máquina (hash)

- Listado: `/nfc/es/index.html#/`
- Detalle: `/nfc/es/index.html#/m/mx-101`
- Config: `/nfc/es/index.html#/m/mx-101/config`

## Checklist antes de publicar

- `npm run lint:links`
- Navegar:
  - `/`
  - `/nfc/index.html`
  - `/nfc/es/index.html`
  - `/nfc/es/contacto.html`
  - `/nfc/es/privacidad.html`
  - `/nfc/es/auth/login.html`
  - `/nfc/es/auth/registro.html`
  - `/nfc/es/auth/reset.html`
- Sin errores en consola.
