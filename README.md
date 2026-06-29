# DemiurgosLocal

Base app Next.js 15 + React 19 + TypeScript strict + Tailwind 4 para flujo SDD.

## Quick start

```bash
pnpm install
pnpm dev
```

## Build de producción

```bash
pnpm build
pnpm start
```

## Scripts

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `vitest run`
- `pnpm test:e2e`
- `pnpm format`

## Dark mode

El dark mode es **opcional por feature**. La base soporta variantes `dark:` de Tailwind para estilos según necesidad.

## Bundle size

El tamaño de bundle se monitorea continuamente. Meta actual: mantenerse por debajo de **300KB (gzipped)** en rutas críticas.
