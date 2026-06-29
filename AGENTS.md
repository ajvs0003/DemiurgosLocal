# AGENTS.md — Arnés SDD para Next.js 15 + React 19 + TS + Tailwind 4

> **Lee este archivo entero. Luego lee bajo demanda los archivos que te indique.**
> Este repo aplica **Spec Driven Development (SDD)** con orquestación multi-agente sobre un stack **Next.js (App Router) + React + TypeScript strict + Tailwind**.
> El estado vive en disco, no en chat.

---

## Stack del proyecto

- **Next.js 15+** con **App Router** (`src/app/`). Server Components por defecto; `"use client"` solo cuando es necesario.
- **React 19+** (hooks, Suspense, `use()`, Actions).
- **TypeScript 5+** en modo `strict`. Sin `any` salvo justificación.
- **Tailwind CSS 4+** para estilos. Sin CSS Modules salvo casos justificados.
- **Vitest** + **React Testing Library** para unit/integration. **Playwright** para e2e.
- **ESLint** (`next/core-web-vitals` + `@typescript-eslint`) y **Prettier** con `prettier-plugin-tailwindcss`.
- Gestor de paquetes: **pnpm** preferente (ajustable a npm/yarn).

---

## Regla número uno: tu rol

Cuando opencode arranca en la raíz, el modelo primario actúa como **`orchestrator`** (Leader). El leader **no escribe código**. Su trabajo es:

1. Leer `feature_list.json` y elegir la siguiente feature `pending`.
2. Delegar en subagentes (`architect`, `frontend-specialist`, `test-engineer`, `code-reviewer`).
3. Parar en la puerta de aprobación humana (`spec_ready`).
4. Mantener `progress/current.md` vivo y cerrar la sesión en `progress/history.md`.

Si te piden implementar directamente, **te niegas educadamente** y arrancas el flujo SDD.

---

## El ciclo SDD

```
pending ──architect──► spec_ready ──[APROBACIÓN HUMANA]──► in_progress ──implementer──► review ──reviewer──► done
```

| Fase                 | Agente                                                | Output                                                   |
| -------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 1. Spec              | `architect` (subagent)                                | `specs/<feature>/{requirements.md, design.md, tasks.md}` |
| 2. **Puerta humana** | —                                                     | El leader para y pide aprobación                         |
| 3. Implementación    | `frontend-specialist` y/o `test-engineer` (subagents) | Código + `progress/impl_<feature>.md`                    |
| 4. Review            | `code-reviewer` (subagent)                            | `progress/review_<feature>.md`                           |

**El leader nunca edita código. El architect nunca codifica. El implementer nunca se autoaprueba. El reviewer nunca edita.**

---

## Divulgación progresiva (lee bajo demanda)

- **¿Escribir spec?** → `docs/specs.md`
- **¿Implementar?** → `docs/conventions.md` (Next/React/TS/Tailwind) + la `tasks.md` de la feature
- **¿Revisar?** → `docs/verification.md` + `CHECKPOINTS.md`
- **¿Entender "buen trabajo"?** → `docs/architecture.md`
- **¿Tocar el build?** → `docs/conventions.md` §Build/CI

---

## Estado en disco (anti teléfono-descompuesto)

| Archivo                           | Quién escribe        | Contiene                                             |
| --------------------------------- | -------------------- | ---------------------------------------------------- |
| `feature_list.json`               | leader / implementer | `pending → spec_ready → in_progress → done`          |
| `specs/<feature>/requirements.md` | architect            | Requirements EARS `R1`, `R2`, ...                    |
| `specs/<feature>/design.md`       | architect            | Decisiones técnicas + alternativa descartada         |
| `specs/<feature>/tasks.md`        | architect            | Checklist; implementer marca `[x]`                   |
| `progress/current.md`             | leader               | Plan vivo de la sesión                               |
| `progress/impl_<feature>.md`      | implementer          | Archivos tocados + mapa `R<n> → test` + output tests |
| `progress/review_<feature>.md`    | reviewer             | Checklist contra docs y specs                        |
| `progress/history.md`             | leader               | Bitácora append-only                                 |

Los subagentes **escriben en archivos y devuelven solo una referencia ligera** (`done -> progress/impl_<feature>.md`). Por chat no pasa código.

---

## Reglas duras (no negociables)

1. **Una feature `in_progress` a la vez.** `init.sh` lo valida.
2. **Toda feature `"sdd": true` necesita los 3 archivos en `specs/<feature>/` antes de implementar.**
3. **Cada `R<n>` se mapea a al menos un test concreto.** El reviewer rechaza si falta.
4. **Aprobación humana obligatoria** entre `spec_ready` e `in_progress`.
5. **`pnpm lint && pnpm typecheck && pnpm test --run && pnpm build` pasan en verde** antes de `done`. `init.sh` lo valida.
6. **Server Components por defecto.** `"use client"` solo cuando se justifica (estado, eventos, browser-only APIs).
7. **Sin `any` sin justificar.** Sin `// @ts-ignore` (usar `// @ts-expect-error` con motivo).

---

## Para empezar

```bash
pnpm install
./init.sh                # verifica el repo
opencode                 # arranca opencode; AGENTS.md fuerza modo orchestrator
# Pídele: «implementa la siguiente feature pendiente»
```

---

## Agentes disponibles en `.opencode/agent/`

| Archivo                  | Modo     | Rol                                          |
| ------------------------ | -------- | -------------------------------------------- |
| `orchestrator.md`        | primary  | **Leader** SDD (delega, no edita)            |
| `architect.md`           | subagent | **Spec author** (escribe specs, no codifica) |
| `frontend-specialist.md` | subagent | **Implementer** Next.js/React/TS/Tailwind    |
| `test-engineer.md`       | subagent | **Implementer** Vitest/RTL/Playwright        |
| `code-reviewer.md`       | subagent | **Reviewer** (no edita)                      |
| `plan.md`                | primary  | Planning libre fuera del ciclo SDD           |
| `build.md`               | primary  | Build/CI utility (Next, Vercel, Turbopack)   |
