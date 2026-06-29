# docs/verification.md — Cómo demostrar que funciona

"Funciona" en este repo significa: **`pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` en verde y trazabilidad `R<n> → test` cerrada**. Lo demás es opinión.

## Stack de testing

- **Unit + integration**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) + [@testing-library/user-event](https://testing-library.com/docs/user-event/intro).
- **E2E**: [Playwright](https://playwright.dev/).
- **Mocking HTTP**: [MSW](https://mswjs.io/) (Mock Service Worker) — Node handler para Vitest, browser handler opcional.
- **Type-check**: `tsc --noEmit`.
- **Lint**: `next lint` (que extiende `next/core-web-vitals` + `@typescript-eslint`).

## Comandos canónicos

```bash
# Lo que corre CI
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test --run
pnpm build

# Día a día
pnpm dev              # next dev --turbo
pnpm test             # vitest watch
pnpm test --run       # one-shot (lo que usan implementer/reviewer)
pnpm test --coverage  # cobertura
pnpm test:e2e         # playwright
pnpm test:e2e --ui    # con UI mode
```

## Qué se testea y cómo

### Componentes React (Vitest + RTL)

```tsx
// src/components/UserCard/UserCard.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "./UserCard";

test("R1: renders user name and email", () => {
  render(<UserCard user={{ name: "Ana", email: "a@b.com" }} />);
  expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
  expect(screen.getByText("a@b.com")).toBeInTheDocument();
});

test("R2: invokes onSelect when clicked", async () => {
  const onSelect = vi.fn();
  render(<UserCard user={{ name: "Ana", email: "a@b.com" }} onSelect={onSelect} />);
  await userEvent.click(screen.getByRole("button", { name: /seleccionar/i }));
  expect(onSelect).toHaveBeenCalledOnce();
});
```

Reglas:

- Queries por **rol** y por **texto accesible** preferentemente. `getByTestId` solo como último recurso.
- `userEvent` > `fireEvent` (simula interacción real).
- `await` siempre con `userEvent` y con `findBy*`.

### Hooks

```ts
import { renderHook, act } from "@testing-library/react";
import { useToggle } from "./useToggle";

test("R1: toggles state", () => {
  const { result } = renderHook(() => useToggle(false));
  expect(result.current[0]).toBe(false);
  act(() => result.current[1]());
  expect(result.current[0]).toBe(true);
});
```

### Server Actions

- Test directamente la función (es server-only, sin DOM):
  ```ts
  import { createNote } from "@/server/actions/create-note";

  test("R3: rejects empty title", async () => {
    const fd = new FormData();
    fd.set("title", "");
    const result = await createNote(fd);
    expect(result).toEqual({ ok: false, error: "invalid" });
  });
  ```
- Mock de capa de datos (`db`, `prisma`, etc.) con `vi.mock`.

### Route Handlers (`app/api/.../route.ts`)

```ts
import { GET } from "@/app/api/notes/route";

test("R1: returns list of notes", async () => {
  const res = await GET(new Request("http://localhost/api/notes"));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json).toEqual({ notes: expect.any(Array) });
});
```

### Mockear módulos de Next

```ts
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));
```

### MSW para fetches

```ts
// tests/setup.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.get("https://api/users", () => HttpResponse.json({ users: [] })),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E (Playwright)

- Solo flujos críticos del producto. No exhaustivo.
- Cada test arranca con DB/seed conocidos o stub. Sin dependencias entre tests.
- Page Object Model **opcional** — solo si la suite crece y hay duplicación clara.

```ts
// tests/e2e/login.spec.ts
import { test, expect } from "@playwright/test";

test("R1: user can log in and reach dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@example.com");
  await page.getByLabel("Password").fill("hunter2");
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /panel/i })).toBeVisible();
});
```

## Trazabilidad `R<n> → test`

Regla dura:

- Cada `R<n>` en `requirements.md` aparece en al menos un test cuya descripción menciona `R<n>` o cuya cobertura el implementer documenta en `progress/impl_<feature>.md`.
- El test debe **fallar si el comportamiento se rompe**. Mental check del implementer: "si borro la línea X, ¿este test falla?".
- El reviewer corre los tests con sus propios ojos y verifica la tabla `R<n> → test`.

## Qué pasa en `init.sh`

1. Verifica `feature_list.json` y que **a lo sumo una** feature está `in_progress`.
2. Para cada feature con `"sdd": true` en estado distinto de `pending`, verifica `specs/<feature>/{requirements,design,tasks}.md`.
3. Instala dependencias si falta `node_modules` (pnpm preferente).
4. Corre `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`.
5. Sale en verde si todo OK; rojo + mensaje si algo falla.

**Si `init.sh` no sale verde, nada se considera `done`.**

## Definición de "Done"

Una feature está `done` cuando, en este orden, **todo** es cierto:

1. Todas las tasks de `tasks.md` marcadas `[x]`.
2. Cada `R<n>` mapeada a al menos un test en `progress/impl_<feature>.md`.
3. `pnpm lint` ✓
4. `pnpm typecheck` ✓
5. `pnpm test --run` ✓
6. `pnpm build` ✓
7. `init.sh` ✓
8. `progress/review_<feature>.md` veredicto `approved`.
9. `feature_list.json` transicionado a `done`.
10. Entrada en `progress/history.md`.

Falta cualquiera → no es `done`. Da igual cómo se vea el código.

## Cobertura

- Sin umbral mágico. La trazabilidad `R<n>→test` manda.
- Cobertura **muy baja en archivos modificados** = tests insuficientes; el reviewer puede pedirlos.
- 100% con tests débiles < 80% con tests duros.

## Cuando los tests fallan

1. No los desactives.
2. Reproduce localmente con el comando exacto.
3. Diagnostica causa raíz, no síntoma.
4. Arregla código o test, según corresponda. Si cambió el test, justifícalo en el commit.
5. Tests flaky por entorno (timing/red) → `test.retry()` con justificación documentada.
