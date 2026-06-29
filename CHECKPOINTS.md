# CHECKPOINTS.md — Criterios de "estado final correcto"

Stack: **Next.js 15 + React 19 + TS strict + Tailwind 4**. Este archivo es el oráculo del reviewer y del leader cuando decide si una feature está `done`. Si un checkpoint bloqueante falla, el veredicto es `changes_requested`.

## Por feature SDD

- [ ] **C1.** Los 3 archivos existen en `specs/<feature>/`: `requirements.md`, `design.md`, `tasks.md`.
- [ ] **C2.** Cada `R<n>` en `requirements.md` cubierta por ≥1 test, documentado en `progress/impl_<feature>.md`.
- [ ] **C3.** Todas las tasks en `tasks.md` marcadas `[x]`.
- [ ] **C4.** `progress/impl_<feature>.md` existe con: archivos tocados, mapa `R<n>→test`, output literal de tests/build, notas.
- [ ] **C5.** `progress/review_<feature>.md` existe con veredicto `approved`.
- [ ] **C6.** No hay `[OPEN QUESTION]` sin resolver en `requirements.md`.
- [ ] **C7.** `feature_list.json` con la feature en `status: "done"`.
- [ ] **C8.** Entrada appendeada a `progress/history.md`.

## Por commit / PR

- [ ] **C9.** `pnpm lint` pasa.
- [ ] **C10.** `pnpm typecheck` pasa.
- [ ] **C11.** `pnpm test --run` pasa.
- [ ] **C12.** `pnpm build` pasa.
- [ ] **C13.** `./init.sh` sale en verde.

## Next.js específicos (bloqueantes donde apliquen)

- [ ] **C14.** `"use client"` solo donde se justifica (estado, eventos, refs, browser APIs). Ningún RSC con `useState`/`useEffect`/event handlers.
- [ ] **C15.** Server Actions con `"use server"`, validación de input (Zod o equivalente), devuelven discriminated unions, llaman `revalidateTag`/`revalidatePath` tras mutar.
- [ ] **C16.** `error.tsx`, `loading.tsx`, `not-found.tsx` presentes donde la spec los requería.
- [ ] **C17.** `<Link>` para nav interna; `<Image>` con `width`/`height` o `fill`+`sizes`; `next/font` para fuentes.
- [ ] **C18.** `metadata` o `generateMetadata` definidos si la feature impactaba SEO.
- [ ] **C19.** Sin `NEXT_PUBLIC_*` para secrets; sin secrets hardcodeados en cliente.
- [ ] **C20.** Sin `useEffect`+`fetch` donde un RSC habría servido.

## TypeScript (bloqueantes)

- [ ] **C21.** Sin `any` no justificado. Sin `@ts-ignore` (usar `@ts-expect-error` con motivo).
- [ ] **C22.** Props tipadas explícitamente, sin spreads ciegos.
- [ ] **C23.** Tipos estrechos (uniones literales, discriminated unions).

## Tailwind (bloqueantes donde apliquen)

- [ ] **C24.** Sigue la escala de Tailwind; `arbitrary values` justificadas.
- [ ] **C25.** Sin clases concatenadas dinámicamente (`bg-${x}-500`); mapas explícitos o CVA.
- [ ] **C26.** `cn` (clsx + tailwind-merge) en composiciones condicionales.
- [ ] **C27.** Focus visible presente (`focus-visible:ring-*` o equivalente).

## Accesibilidad (bloqueantes para UI)

- [ ] **C28.** HTML semántico (`<button>`, `<nav>`, `<main>`, etc.), no `<div>` para todo.
- [ ] **C29.** Labels reales (`<label htmlFor>`) o `aria-label`. Contraste AA. Navegable por teclado.
- [ ] **C30.** Estados `loading`/`error`/`empty` cubiertos en UI.

## Por sesión

- [ ] **C31.** A lo sumo **una** feature `in_progress` en `feature_list.json`. `init.sh` lo rechaza si hay más.
- [ ] **C32.** `progress/current.md` refleja el estado real o está vacío al cerrar.
- [ ] **C33.** Roles respetados:
  - Architect no tocó código en `src/`.
  - Reviewer no tocó nada salvo `progress/review_*.md`.
  - Leader no tocó código en `src/`.

## Calidad (no bloqueantes, se reportan)

- [ ] **C34.** Sin `console.log` olvidados.
- [ ] **C35.** Sin TODOs sin issue asociado.
- [ ] **C36.** Sin código muerto / imports sin usar.
- [ ] **C37.** Sin listas sin `key` estable.

## Cómo se usa

El reviewer copia este checklist a `progress/review_<feature>.md` y lo rellena con evidencia (rutas, líneas, output). Si **cualquiera de C1–C33 falla**, el veredicto es `changes_requested`. C34–C37 se reportan como observaciones; el leader decide si bloquean o se convierten en feature de follow-up.
