# Desarrollo

## Requisitos

- Node.js 22.12+ (recomendado) o 20.19+
- Si usas Node 24 y Vite falla, cambia a Node LTS

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