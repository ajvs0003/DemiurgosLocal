# docs/specs.md — Proceso Spec Driven Development

Este documento define **exactamente** cómo se escribe una spec en este repo. Es de obligada lectura para el `architect` y para cualquier humano que apruebe specs.

## Las 3 fases

```
1. requirements.md  (qué debe hacer, en EARS)
       ↓
2. design.md        (cómo lo haremos, decisiones técnicas)
       ↓
3. tasks.md         (checklist ejecutable)
       ↓
[APROBACIÓN HUMANA OBLIGATORIA]
       ↓
4. code             (implementer ejecuta tasks una a una)
```

## requirements.md — EARS notation

Cada requirement se numera (`R1`, `R2`, ...) y usa una de las cinco formas:

### Ubiquitous (siempre aplica)

```
R1. El sistema DEBE persistir las notas en formato JSON atómico.
```

### Event-driven (responde a un trigger)

```
R2. CUANDO el usuario ejecuta `cli add`, el sistema DEBE crear una nota con id único e ISO timestamp.
```

### State-driven (mientras un estado se mantiene)

```
R3. MIENTRAS el archivo de notas esté bloqueado, el sistema DEBE reintentar hasta 3 veces con backoff de 100ms.
```

### Optional feature (condicional a un toggle)

```
R4. SI la flag `--verbose` está activa, ENTONCES el sistema DEBE imprimir el path absoluto del archivo de notas.
```

### Unwanted behavior (qué hacer ante condiciones indeseadas)

```
R5. SI el archivo de notas está corrupto, ENTONCES el sistema DEBE abortar con código de salida 2 y mensaje "corrupt store at <path>".
```

### Reglas de buen requirement

- **Una idea por R.** Si te sale "el sistema DEBE X y DEBE Y", pártelo en dos.
- **Verificable.** Un requirement que no se puede convertir en test está mal escrito.
- **Sin detalles de implementación.** "El sistema DEBE usar React Query" → mal. "El sistema DEBE cachear respuestas durante 60s" → bien.
- **Cubre happy path + edge + errores.** No solo el feliz.
- **OPEN QUESTIONS van marcadas.** Si no sabes algo, escribe `R<n>. [OPEN QUESTION] ¿Debe X o Y?` para que el humano lo resuelva en la aprobación.

## design.md

Plantilla mínima:

```markdown
# Design: <feature>

## Contexto

<En qué parte del sistema encaja. Qué módulos toca. Por qué ahora.>

## Decisión

<La decisión técnica concreta. Diagramas si ayudan. Pseudocódigo si aclara.>

## Alternativa descartada

<Una alternativa REAL que consideraste. Por qué no la elegiste.>

## Impacto

- Archivos nuevos:
- Archivos modificados:
- APIs públicas afectadas:
- Breaking changes / migraciones:

## Riesgos

- <riesgo 1>: <mitigación>
- <riesgo 2>: <mitigación>
```

### Reglas

- **Siempre una alternativa descartada.** Si no la tienes, no has pensado lo suficiente.
- **Decide.** Un design.md que dice "podríamos hacer X o Y" no es un design, es un planning. Decide y justifica.
- **Cabe en una pantalla salvo features grandes.** Si necesitas 3 páginas, probablemente la feature es demasiado grande y debes partirla.

## tasks.md

Checklist accionable que un implementer pueda seguir mecánicamente.

```markdown
# Tasks: <feature>

- [ ] T1. Crear `src/foo/bar.ts` con la firma `export function bar(input: BarInput): BarOutput`. Cubre R1.
- [ ] T2. Implementar `bar()` según design.md §Decisión. Cubre R1, R2.
- [ ] T3. Escribir `src/foo/bar.test.ts::"R1: persists atomically"`. Cubre R1.
- [ ] T4. Escribir `src/foo/bar.test.ts::"R3: retries 3 times on lock"`. Cubre R3.
- [ ] T5. Actualizar `README.md` con ejemplo de uso.
```

### Reglas

- **Cada task = ~1 commit razonable.** Si dura más de ~30 min de implementer, pártela.
- **Cada R<n> aparece en al menos una task.** El reviewer lo verifica.
- **Cada task referencia qué R cubre.** Si una task no cubre ningún R, sobra (o falta un R en requirements).
- **Tests son tasks de primera clase.** No un apéndice.
- **Orden importa.** Una task no puede asumir resultado de una task posterior.

## La puerta humana

Cuando los tres archivos están escritos, la feature pasa a `spec_ready`. El `orchestrator` PARA y pide al humano:

> "He preparado la spec en `specs/<feature>/`. Léela y responde 'aprobado' para continuar, o pide cambios."

El humano abre los 3 archivos en su editor (no en chat) y:

- **Si todo cuadra**, dice "aprobado". El leader transiciona a `in_progress` y lanza el implementer.
- **Si hay cambios**, los enumera. El leader re-delega al `architect` para iterar.

**No se implementa código hasta que el humano apruebe explícitamente.** No vale "sigo viendo bien la spec, tiro p'alante". El humano aprueba.
