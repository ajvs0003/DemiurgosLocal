# docs/architecture.md — Qué significa "buen trabajo" en este repo

Stack: **Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind 4**.

## Principios SDD

### 1. El repositorio es el sistema
Conocimiento en archivos versionados (`AGENTS.md`, `docs/`, `specs/`, `progress/`). Cualquier agente o humano entra en frío, lee y aporta.

### 2. Estado en disco
Decisiones, planes, reviews y progresos en archivos. El chat es transporte.

### 3. Una feature en vuelo a la vez
Solo una `in_progress` en `feature_list.json`. `init.sh` lo valida.

### 4. Spec antes que código
Sin `requirements.md` + `design.md` + `tasks.md` aprobados, no se toca código.

### 5. Trazabilidad obligatoria
Cada `R<n>` → al menos un test que falla si el comportamiento se rompe.

### 6. Separación de roles
Leader orquesta · Architect especifica · Implementer ejecuta · Reviewer verifica. Cada uno en su carril.

### 7. Verificación ejecutable
"Funciona" = `pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` en verde.

---

## Estructura del proyecto Next.js

```
.
├── src/
│   ├── app/                       # App Router (Server Components por defecto)
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home (RSC)
│   │   ├── globals.css            # Tailwind directives + tokens
│   │   ├── (marketing)/           # Route groups
│   │   ├── (app)/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx       # RSC
│   │   │       ├── loading.tsx    # Suspense fallback
│   │   │       ├── error.tsx      # Error boundary ("use client")
│   │   │       └── _components/   # Componentes privados de la ruta
│   │   └── api/                   # Route handlers (cuando aplique)
│   │       └── <resource>/route.ts
│   ├── components/
│   │   ├── ui/                    # Primitivos reutilizables (Button, Input...)
│   │   └── <feature>/             # Componentes por dominio de feature
│   ├── lib/                       # Utilidades framework-agnostic (fetcher, formatters)
│   ├── hooks/                     # use<Name>.ts (cliente)
│   ├── server/                    # Lógica server-only (db, auth, services)
│   │   └── actions/               # Server Actions
│   ├── types/                     # Tipos compartidos
│   └── styles/                    # Tokens Tailwind extra si los hay
├── public/                        # Assets estáticos
├── tests/
│   ├── unit/                      # *.test.ts(x) — Vitest + RTL
│   └── e2e/                       # *.spec.ts — Playwright
├── specs/                         # SDD
├── progress/                      # SDD
├── docs/                          # SDD
├── .opencode/agent/               # Agentes
├── next.config.ts
├── tailwind.config.ts             # (opcional en v4 si todo en CSS)
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.mjs
├── package.json
├── AGENTS.md
├── CHECKPOINTS.md
├── feature_list.json
└── init.sh
```

### Convenciones de ruta

- **Server Components por defecto.** No metas `"use client"` salvo que necesites estado, eventos, `useEffect`, refs, o browser-only APIs.
- **Route groups** `(name)` para layouts paralelos sin afectar la URL.
- **`_components/`** dentro de la ruta para piezas privadas de esa pantalla (Next ignora `_` para routing).
- **Server Actions** en `src/server/actions/` con `"use server"` arriba. Validan input (Zod o similar) y devuelven discriminated unions `{ ok: true, data } | { ok: false, error }`.
- **Route handlers** (`app/api/.../route.ts`) solo si no basta con Server Actions.

### Server vs Client

| Ponlo en server | Ponlo en client |
|---|---|
| Fetch de datos, secrets, auth, DB | `useState`, `useEffect`, refs |
| Renderizado estático/dinámico | Eventos (`onClick`, `onChange`) |
| Lógica que no debe ir al bundle | Browser-only APIs (`window`, `localStorage`) |
| | Animaciones reactivas, focus/scroll |

Mueve la frontera lo más abajo posible en el árbol: layouts y pages como RSC, hojas hojas hojas como Client Components.

### Data fetching

- En RSC: `fetch()` directo, `await` arriba. Usa `cache()` de `react` o `next: { revalidate, tags }` según necesites.
- En Client Components que necesiten datos del cliente: hooks dedicados (`useSWR`, `@tanstack/react-query`) **solo si la app lo justifica**. Para fetches simples, pasa props desde el RSC padre.

---

## Personalización por proyecto

Añade aquí las particularidades reales del repo:
- Dominio (banca, e-commerce, dashboard interno…).
- Restricciones (validación de IBAN, formato `Intl.NumberFormat('es-ES', { style: 'currency' })`, etc.).
- Performance budgets, accesibilidad mínima (WCAG AA), Core Web Vitals objetivo.
- Integraciones (Supabase, Auth.js, Stripe, etc.).

## Anti-patrones a evitar

- **`"use client"` en el root** o en layouts grandes — bundlea toda la app al cliente.
- **`useState`/`useEffect` para datos que podrían venir de un Server Component**.
- **Fetch en cliente sin necesidad** — duplica peticiones, expone keys, mata SSR.
- **Tailwind `arbitrary values` por defecto** (`w-[127px]`) — usa la escala salvo justificación.
- **CSS-in-JS** (styled-components, emotion) en Server Components — no funciona sin opt-in.
- **`<img>`** en lugar de `<Image>` de Next salvo casos justificados.
- **`router.push` para navegación interna** cuando un `<Link>` basta.
