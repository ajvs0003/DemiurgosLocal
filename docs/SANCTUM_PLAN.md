# Sanctum Refactor + Edit Mode — Plan & Progress

> Documento vivo. Si nos quedamos sin contexto, lee esto primero para retomar
> exactamente donde lo dejamos. Marca con [x] lo completado.

## Objetivo global

1. **Arreglar** la línea vertical que parte el Sanctum por la mitad (es el
   "spine gutter" del libro filtrándose desde `MainCanvas`).
2. **Convertir Sanctum en el creador universal** con 5 pestañas, cada una
   con un formulario que refleja los datos de su vista de detalle:
   - **Arcanum** (default) → spells/monstruos/equipo… (lo que ya hace hoy)
   - **Evento** → entrada de la línea del tiempo (`TimelineView`)
   - **Campaña** → crónica (`WorldView`)
   - **Personaje** → ficha (`CharactersView`)
   - **Localización** → lugar de mapa (mock hasta que exista la página de mapa)
3. **Añadir botones de edición** en las vistas de detalle: lápiz para editar
   bloques de texto inline (bio, historia, resúmenes, etc.), botones para
   añadir/quitar items de listas (crónicas, lugares, vínculos, eventos…).

---

## Fases

### Fase 1 — Spine line + scaffolding
- [x] Quitar la línea vertical en la rama `sanctum` de `MainCanvas` en `index.html`.
- [x] Crear este MD.

### Fase 2 — Tab shell en Sanctum
- [x] Añadir tira de pestañas en la cabecera del Sanctum (Arcanum, Evento, Campaña, Personaje, Localización).
- [x] Extraer el formulario actual a `ArcanumForm` (tab por defecto).
- [x] Cada tab decide qué form renderiza y qué vista previa.

### Fase 3 — Formularios nuevos
- [x] **EventoForm** + preview (línea del tiempo).
  Fields: era (select), year, title, summary, chronicles (lista de {title, sessions, status, note}), heroes (lista de {name, role, kind}), events (lista de strings).
- [x] **CampañaForm** + preview (banner de crónica).
  Fields: title, session (string ej "Session 12"), date (ej "Age 3, Moon of Shadows"), status (Active/Paused/Completed), players (number), summary, tags (lista de strings).
- [x] **PersonajeForm** + preview (mini card).
  Fields: name, class, level, race, background, alignment, player, origin (nae/dnd),
  AC, init, speed, hpMax, hitDice,
  abilities (STR/DEX/CON/INT/WIS/CHA),
  saves (multi de las 6), skills (multi de los 18),
  attacks (lista de {name, hit, dmg, note}),
  proficiencies, languages, bio.
- [x] **LocalizacionForm** + preview (mock card).
  Fields: name, region, kind (Capital/Escondite/Templo/Bosque/Aldea/Arena/Ruina/Tundra/Comercio…), coordinates {x,y} (mock), notes, related characters (multi).

### Fase 4 — Botones de edición en vistas de detalle
- [ ] **Personaje** (`CharactersView`):
  - [ ] Lápiz en bloque bio (epígrafe) → editable inline.
  - [ ] Lápiz por sección de Historia (heading + body) → editable.
  - [ ] Lápiz por tarjeta en Crónicas/Lugares/Vínculos.
  - [ ] Botón "+ Añadir" al final de cada lista (Historia, Crónicas, Lugares, Vínculos).
  - [ ] Botón "Editar ficha" para abrir un panel de edición sobre la pestaña Ficha (AC/HP/abilities…).
- [ ] **Crónica** (`WorldView`):
  - [ ] Lápiz en resumen, tags.
  - [ ] Edición de estado y meta.
- [ ] **Bestiario** (`BestiaryView`):
  - [ ] Lápiz en flavor, traits, actions.
  - [ ] Botón "+ Añadir rasgo / acción".
- [ ] **Línea del tiempo** (`TimelineView`):
  - [ ] Lápiz en resumen, eventos.
  - [ ] Añadir/quitar héroes y crónicas vinculadas.

### Patrón de edición (canónico)
- Botón lápiz pequeño (Material `edit`, 14px, color ink-soft) arriba a la derecha del bloque, visible al hacer hover sobre el bloque.
- Al hacer clic: el bloque se convierte en un `<textarea>` (texto largo) o `<input>` (texto corto) con el mismo tipo y tamaño.
- Acciones al pie: "Guardar" (wine) · "Cancelar" (ghost link).
- Persistencia: en memoria por ahora (estado React local en cada vista). Si más adelante hay backend, este es el punto a conectar.
- Listas: cada item tiene su propio lápiz + papelera; al final de la lista un botón "+ Añadir".

---

## Datos canónicos por entidad (referencia rápida)

### Evento (Timeline)
```js
{ id, era, year, title, summary, chronicles: [{title,sessions,status,note}], heroes: [{name,role,kind}], events: [string] }
```
Eras: `aurora | silente | hogueras | vacio` (definidas en `TimelineView.jsx`).

### Campaña (World)
```js
{ id, title, session, date, status, players, summary, tags: [string] }
```
Status: `Active | Paused | Completed`.

### Personaje (Characters)
```js
{ id, name, role, origin, class, level, race, background, alignment, player,
  prof, ac, init, speed, hpMax, hpCur, hpTemp, hitDice,
  abilities: {STR,DEX,CON,INT,WIS,CHA},
  saves: [abil], skills: [skillKey],
  attacks: [{name, hit, dmg, note}],
  proficiencies, languages, bio,
  history: [{heading, body}], chronicles: [{title,sessions,role,status,note}],
  places: [{name,region,kind,note}], bonds: [{name,relation,note}] }
```

### Localización (mock para mapa)
```js
{ id, name, region, kind, coords: {x, y}, notes, relatedCharacters: [string] }
```

---

## Estado actual
- Spine line quitada.
- Sanctum con tabs y los 5 formularios funcionando (Arcanum, Evento, Campaña, Personaje, Localización). Cada tab tiene su preview en directo a la derecha.
- Datos viven en memoria (estado React por formulario). Botón "Save Entry" muestra confirmación temporal — listo para enchufarse a persistencia cuando exista.
- Fase 4 (botones de edición en vistas de detalle) **pendiente**.

## Próximo paso al retomar
Empezar la Fase 4 por `CharactersView` → bio + historia, siguiendo el patrón
de edición canónico de arriba. Luego crónicas/lugares/vínculos. Después
expandir a Bestiario, World y Timeline.
