# docs/conventions.md — Estilo, naming, errores (Next + React + TS + Tailwind)

## Naming

- **Componentes**: `PascalCase.tsx` → `UserCard.tsx`.
- **Hooks**: `use<Name>.ts` → `useDebounce.ts`.
- **Utilidades / lib**: `kebab-case.ts` → `format-currency.ts`.
- **Server Actions**: `verb-noun.ts` con `"use server"` → `create-user.ts`.
- **Tipos / interfaces**: `PascalCase` sin prefijo `I`. Prefiere `type` salvo extensión.
- **Funciones / variables**: `camelCase`. Booleanos `is*`, `has*`, `can*`.
- **Constantes globales**: `SCREAMING_SNAKE_CASE`.
- **Tests**: `<archivo>.test.ts(x)` colocado junto al archivo o en `tests/unit/`.
  - Descripciones de tests empiezan por `"R<n>: ..."` cuando cubren un requirement.

## TypeScript

- `strict: true`, **no se desactiva**.
- `noUncheckedIndexedAccess: true` recomendado.
- Evita `any`. Usa `unknown` + narrowing. Si necesitas saltarte el tipo, `// @ts-expect-error <motivo>`, nunca `@ts-ignore`.
- Tipos estrechos > amplios: `'idle' | 'loading' | 'success' | 'error'` > `string`.
- Sin enums de TS (usa uniones de literales).
- `import type` para imports de solo tipos (evita ciclos y reduce bundle).
- Discriminated unions para resultados:
  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: string };
  ```

## React 19

- Componentes **funcionales** con hooks.
- **Sin lógica en JSX**. Extrae a `useMemo`, a variables, o a un hook.
- Props **tipadas explícitamente**, sin spreads ciegos.
- `useEffect` con cleanup siempre que suscribas / timers / subscriptions.
- `useMemo`/`useCallback` **solo cuando aportan** (perf medida).
- Listas con `key` estable (no `index` salvo lista inmutable).
- Prefiere **`use()`** (React 19) y **Suspense** para datos async sobre `useEffect` + estado.
- **Server Actions** para mutaciones; el `<form action={action}>` da progressive enhancement gratis.

## Next.js (App Router)

### Server Components vs Client Components

- **Default = Server.** No añadas `"use client"` por costumbre.
- `"use client"` solo cuando el componente necesita:
  - `useState`, `useReducer`, `useEffect`, `useRef`, `useLayoutEffect`.
  - Event handlers (`onClick`, `onChange`, ...).
  - Browser APIs (`window`, `localStorage`, `navigator`).
  - Librerías que usan lo anterior internamente.
- **Empuja `"use client"` lo más abajo del árbol posible.**

### Layouts y páginas

- `layout.tsx` Server por defecto, sin estado.
- `page.tsx` Server por defecto; `async` permitido para fetch.
- `loading.tsx` para Suspense fallback de la ruta.
- `error.tsx` siempre **Client Component** (lleva `"use client"`).
- `not-found.tsx` para 404 contextual.

### Data fetching

```tsx
// RSC: fetch directo con cacheo nativo
export default async function Page() {
  const res = await fetch("https://api/...", { next: { revalidate: 60 } });
  const data = await res.json();
  return <Foo data={data} />;
}
```

- Tags para revalidación selectiva: `next: { tags: ['users'] }` + `revalidateTag('users')`.
- En Client Components que **necesiten** datos en cliente: hooks específicos. Para casos simples, pasa props desde RSC padre.

### Mutaciones

- Preferir **Server Actions** sobre route handlers:
  ```ts
  // src/server/actions/create-note.ts
  "use server";
  import { z } from "zod";
  import { revalidateTag } from "next/cache";

  const Input = z.object({ title: z.string().min(1) });

  export async function createNote(formData: FormData) {
    const parsed = Input.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { ok: false, error: "invalid" } as const;
    // ... db.insert
    revalidateTag("notes");
    return { ok: true, data: { id: "..." } } as const;
  }
  ```
- Valida siempre input (Zod o equivalente). **Nunca confíes** en el cliente.

### Imágenes y assets

- `<Image>` de `next/image` salvo justificación.
- Define `width`/`height` o `fill` + `sizes`. Sin layout shift.
- Fuentes vía `next/font` (`local` o `google`).

### Navegación

- `<Link href="...">` para navegación interna. Sin `router.push` salvo programática justificada.
- `useRouter` solo en Client Components.

### Metadata y SEO

- `export const metadata: Metadata = {...}` en `layout.tsx` / `page.tsx`.
- `generateMetadata()` async cuando el SEO depende de datos.

## Tailwind CSS 4

- **Sigue la escala de Tailwind**. `arbitrary values` (`w-[127px]`) solo si la escala no llega.
- **Orden de clases canónico**: layout → box → typography → visual → state → responsive → dark. `prettier-plugin-tailwindcss` lo ordena por ti — instálalo y confía.
- **No componentes wrapper triviales** solo para variantes de clase. Usa **CVA** (`class-variance-authority`) o composición con `clsx`/`tailwind-merge`:
  ```tsx
  import { cn } from "@/lib/cn";
  <button className={cn("rounded-md px-4 py-2", isPrimary && "bg-blue-600 text-white")} />;
  ```
- **Sin clases dinámicas concatenadas** (`bg-${color}-500` → Tailwind no las detecta). Usa mapas explícitos:
  ```tsx
  const tone = { success: "bg-green-600", error: "bg-red-600" }[status];
  ```
- **Dark mode**: `dark:` prefix (configura `darkMode` en config si usas estrategia `class`).
- **Tokens de diseño** centralizados en `globals.css` con `@theme` (v4) o en `tailwind.config.ts` (v3).
- **No mezcles Tailwind con CSS Modules** sin motivo. Si necesitas escapar (animaciones complejas, `:has()` raro), usa una clase custom en `globals.css`.

## Accesibilidad (WCAG AA mínimo)

- HTML semántico: `<button>`, `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`. Nada de `<div>` para todo.
- `<button type="button">` por defecto; `type="submit"` solo dentro de form.
- Labels reales (`<label htmlFor>`) o `aria-label` cuando no haya texto visible.
- Foco visible (`focus-visible:ring-2 focus-visible:ring-blue-500`). No quitar el outline sin reponerlo.
- Contraste AA (4.5:1 texto normal, 3:1 grande). No `gray-400` sobre fondo blanco.
- Navegación por teclado en todo. Skip-link al `<main>`.

## Manejo de errores

- **No swallows**. `try/catch` que oculta sin reportar = code smell.
- Errores tipados con discriminated unions; `throw new Error("string")` solo en límites de sistema.
- En Server Actions: devolver `{ ok: false, error }` en lugar de throw.
- En UI: estados `loading` / `error` / `empty` siempre cubiertos. `success` no es el único.
- `error.tsx` en cada subárbol crítico de la app.

## Server Actions específicas

- Archivo dedicado por acción (o por dominio) bajo `src/server/actions/`.
- `"use server"` al inicio.
- Validación de input antes de tocar nada (Zod).
- `revalidateTag` o `revalidatePath` tras mutaciones.
- Sin lógica de UI: devuelve datos, deja que el componente decida.

## Tests (resumen — detalle en `docs/verification.md`)

- AAA visible. Nombres descriptivos: `"R2: muestra error inline si el email es inválido"`.
- Tests deterministas: `vi.useFakeTimers()`, mocks de fecha.
- Independientes: cualquier orden, cualquier paralelización.
- Mock lo externo (red con MSW, módulos de Next con `vi.mock('next/navigation', ...)`), no lo interno.

## Commits

- `type(scope): subject` (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`).
- Una task = un commit razonable.
- Cuerpo opcional con el "por qué".

## Build / CI

Scripts canónicos en `package.json`:

- `dev` — `next dev --turbo`
- `build` — `next build`
- `start` — `next start`
- `lint` — `next lint`
- `typecheck` — `tsc --noEmit`
- `format` — `prettier --write .`
- `test` — `vitest`
- `test:e2e` — `playwright test`

CI corre: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build`. Si alguno falla, falla el PR.
