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

- Listado: `/es/index.html#/`
- Detalle: `/es/index.html#/m/mx-101`
- Config: `/es/index.html#/m/mx-101/config`

## Checklist antes de publicar

- `npm run lint:links`
- Navegar:
  - `/`
  - `/es/index.html`
  - `/es/contacto.html`
  - `/es/privacidad.html`
  - `/es/auth/login.html`
  - `/es/auth/registro.html`
  - `/es/auth/reset.html`
- Sin errores en consola.
