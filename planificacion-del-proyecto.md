# Planificacion del Proyecto - Nae (DnD 5e 2024)

> Documento maestro de planificacion. Ultima actualizacion: 2026-04-03

## 1. Vision general

Crear un **monorepo multipaquete** con:

- **Frontend web** (React + TypeScript + Vite) para navegar reglas oficiales de DnD 5e 2024 y contenido homebrew del mundo **Nae**.
- **Backend** (Node.js + TypeScript + Express) que almacena todo en **SQLite** (un fichero `.db` por coleccion, sin servidor de BD externo). Los masters pueden subir ficheros `.md` que el backend transforma e inserta en la BD correspondiente.
- **Contenido oficial DnD**: importado desde el repositorio `foundryvtt/dnd5e` (rama `5.3.x`, licencia SRD 5.1 / SRD 5.2 / CC-BY-4.0).
- **Contenido del mundo Nae**: razas caseras, localizaciones, mapas e imagenes creados colaborativamente por varios masters.

---

## 2. Decisiones tomadas

| Aspecto | Decision |
|---|---|
| Monorepo | `pnpm` + workspaces |
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + TypeScript + Express |
| Base de datos | **SQLite** via `better-sqlite3`. Un fichero `.db` por coleccion. Sin servidor externo |
| Busqueda | **FTS5** (Full-Text Search nativo de SQLite) |
| Fuente de datos DnD | Repo `https://github.com/foundryvtt/dnd5e` rama `5.3.x` |
| Formato de fuente Foundry | Ficheros `.yml` en `packs/_source/` |
| Importacion | Script one-shot que lee YML de Foundry e inserta en SQLite |
| Contenido masters (Nae) | Masters suben `.md` con frontmatter -> backend lo parsea e inserta en SQLite |
| Origen de datos | Cada entrada tiene campo `origin`: `"dnd"` (oficial) o `"nae"` (homebrew) |
| Imagenes / assets | Servidos por el backend via `express.static` |
| Licencia contenido SRD | CC-BY-4.0 (SRD 5.1 y SRD 5.2) |

---

## 3. Estructura del monorepo

```
.
├── package.json              # pnpm workspaces + scripts raiz
├── pnpm-workspace.yaml
├── tsconfig.base.json        # config TS compartida
├── planificacion-del-proyecto.md
├── docs/
│   ├── arquitectura.md       # detalle tecnico del monorepo
│   ├── modelo-datos.md       # esquemas SQLite por coleccion
│   └── importacion-foundry.md # mapeo YML Foundry -> SQLite
├── external/
│   └── foundry-dnd5e/        # clon del repo foundryvtt/dnd5e (gitignored)
└── packages/
    ├── web/                  # app React + TS + Vite
    ├── api/                  # backend Node/TS + Express
    │   ├── db/               # ficheros SQLite (un .db por coleccion)
    │   ├── assets/           # imagenes, mapas
    │   └── scripts/          # importador Foundry, utilidades
    └── shared/               # tipos/utilidades compartidas (opcional)
```

> Ver `docs/arquitectura.md` para detalle completo.

---

## 4. Fuente de datos: repositorio Foundry dnd5e

- **URL**: `https://github.com/foundryvtt/dnd5e`
- **Rama**: `5.3.x` (version 5.2.5+, incluye SRD 5.2 "2024")
- **Formato**: ficheros `.yml` (YAML) en `packs/_source/`

### 4.1. Estructura de packs/_source (confirmada)

Foundry organiza sus datos en dos grupos:

**Contenido moderno (SRD 5.2 / 2024)** — prioritario para nosotros:

| Pack | Tipo | Contenido |
|---|---|---|
| `origins24/species/` | `race` | 14 especies (Human, Elf, Dwarf, Dragonborn, Gnome, Goliath, Halfling, Orc, Tiefling...) + subcarpeta `traits/` |
| `origins24/backgrounds/` | `background` | Trasfondos 2024 |
| `classes24/` | `class`, `subclass`, `feat` | 12 clases (Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard), cada una en su carpeta con subclases y features |
| `spells24/` | `spell` | Hechizos organizados por nivel: `cantrips/`, `1st-level/` ... `9th-level/`, `supplemental-items/` |
| `equipment24/` | `weapon`, `equipment`, `consumable`, `tool`, `loot`, `container` | Equipo 2024 |
| `feats24/` | `feat` | Dotes 2024 |
| `content24/` | `JournalEntry` | Reglas generales, texto del manual |
| `actors24/` | `Actor` | Monstruos / NPCs 2024 |
| `monsterfeatures24/` | `feat`, `weapon` | Rasgos de monstruos 2024 |
| `tables24/` | `RollTable` | Tablas de tiradas 2024 |

**Contenido legacy (SRD 5.1)** — referencia secundaria:

| Pack | Tipo |
|---|---|
| `races/` | Razas SRD 5.1 |
| `classes/` | Clases SRD 5.1 |
| `subclasses/` | Subclases SRD 5.1 |
| `classfeatures/` | Features de clase SRD 5.1 |
| `spells/` | Hechizos SRD 5.1 |
| `items/` | Items SRD 5.1 |
| `backgrounds/` | Trasfondos SRD 5.1 |
| `monsters/` | Monstruos SRD 5.1 |
| `rules/` | Texto de reglas SRD 5.1 |

### 4.2. Formato de los ficheros fuente

Los ficheros **NO son JSON**, son **YAML** (`.yml`). Ejemplo resumido de un species:

```yaml
name: Human
type: race
_id: phbspHuman000000
system:
  description:
    value: "<p>...HTML con la descripcion...</p>"
  source:
    rules: '2024'
    license: CC-BY-4.0
  identifier: human
  movement:
    walk: 30
  senses:
    darkvision: null
  type:
    value: humanoid
    subtype: Human
  advancement: [...]  # rasgos, opciones de tamanio, etc.
img: icons/environment/people/commoner.webp
```

> Ver `docs/importacion-foundry.md` para el mapeo completo de campos.

---

## 5. Modelo de almacenamiento (SQLite)

### 5.1. Filosofia

- **Un fichero `.db` por coleccion** (species.db, classes.db, spells.db, etc.).
- Cada BD contiene **tanto contenido DnD oficial como contenido Nae** (diferenciados por campo `origin`).
- **Sin servidor de BD externo**: SQLite es un fichero en disco, `better-sqlite3` lo abre directamente.
- **Busqueda full-text nativa** con FTS5 de SQLite (sin librerias adicionales).

### 5.2. Flujo general

```
[Foundry .yml] --> [Script importador] --> [INSERT en SQLite con origin="dnd"]
                                                  |
                                           [FTS5 indexa automaticamente]

[Master sube .md] --> [API parsea frontmatter] --> [INSERT en SQLite con origin="nae"]
                                                  |
                                           [FTS5 indexa automaticamente]
```

### 5.3. Estructura en disco del backend

```
packages/api/
├── db/                        # Ficheros SQLite
│   ├── species.db             # Razas/especies (DnD + Nae)
│   ├── classes.db             # Clases y subclases
│   ├── spells.db              # Hechizos
│   ├── equipment.db           # Equipo (armas, armaduras, herramientas...)
│   ├── feats.db               # Dotes
│   ├── backgrounds.db         # Trasfondos
│   ├── monsters.db            # Monstruos / NPCs
│   └── rules.db               # Reglas generales (texto del manual)
└── assets/
    └── images/
```

### 5.4. Busqueda

- Cada `.db` tiene una tabla FTS5 asociada (ej: `species_fts`) que indexa `name`, `summary`, `body`, `tags`.
- Endpoint `GET /search?q=...` consulta todas las tablas FTS5 y combina resultados.
- Sin necesidad de MiniSearch ni index.json: SQLite lo maneja todo.

### 5.5. Campo `origin`

Cada entrada tiene un campo `origin` que indica su procedencia:
- `"dnd"` — contenido oficial importado de Foundry (SRD 5.1/5.2).
- `"nae"` — contenido homebrew creado por los masters del mundo Nae.

Esto permite:
- Filtrar por origen en los endpoints (`GET /species?origin=nae`).
- Mostrar en el frontend badges "Oficial" vs "Nae".
- Proteger contenido DnD de edicion accidental (solo Nae es editable).

> Ver `docs/modelo-datos.md` para los esquemas SQL detallados.

---

## 6. Fases de desarrollo

### FASE 1 — Informacion basica DnD (COMPLETADA ✅)

> Objetivo: tener las BDs SQLite pobladas con reglas oficiales, listas para servir.

- [x] Clonar repo `foundryvtt/dnd5e` en `external/foundry-dnd5e/`
- [x] Analizar estructura YML de cada pack (species, classes, spells, equipment, feats, backgrounds, monsters, rules)
- [x] Definir esquemas SQL para cada coleccion (ver `docs/modelo-datos.md`)
- [x] Definir mapeo YML Foundry -> SQL para cada tipo (ver `docs/importacion-foundry.md`)
- [x] Crear script importador (`packages/api/scripts/import-foundry.ts`)
- [x] Ejecutar importacion y verificar resultados
- [x] Verificar que FTS5 funciona correctamente

**Resultado obtenido**: directorio `packages/api/db/` con 8 ficheros `.db` poblados con contenido DnD origin="dnd".

| BD | Registros | Tamaño |
|---|---|---|
| species.db | 50 | 172 KB |
| classes.db | 12 | 108 KB |
| spells.db | 340 | 836 KB |
| equipment.db | 334 | 844 KB |
| feats.db | 17 | 76 KB |
| backgrounds.db | 4 | 44 KB |
| monsters.db | 380 | 264 KB |
| rules.db | 817 | 1,576 KB |
| **Total** | **1,982 registros** | **~3.9 MB** |

### FASE 2 — Base de la API (ACTUAL)

> Objetivo: API funcional que consulta SQLite y sirve datos al frontend.

- [ ] Inicializar monorepo (`package.json` raiz, `pnpm-workspace.yaml`, `tsconfig.base.json`)
- [ ] Crear paquete `packages/api/` con Express + TS + better-sqlite3
- [ ] Endpoints publicos de lectura (cada uno consulta su .db):
  - `GET /species` / `GET /species/:id` — acepta `?origin=dnd|nae`
  - `GET /classes` / `GET /classes/:id`
  - `GET /spells` / `GET /spells/:id` — acepta `?level=X&school=X`
  - `GET /equipment` / `GET /equipment/:id`
  - `GET /feats` / `GET /feats/:id`
  - `GET /backgrounds` / `GET /backgrounds/:id`
  - `GET /monsters` / `GET /monsters/:id`
  - `GET /rules` / `GET /rules/:id`
  - `GET /search?q=...` — busqueda FTS5 cruzada en todas las BDs
- [ ] Servir assets estaticos (`express.static` sobre `assets/`)
- [ ] Endpoints de administracion (masters):
  - `POST /admin/import-md` (subir .md -> parsear frontmatter -> INSERT en SQLite con origin="nae")
  - `POST /admin/upload-image` (subir imagen a assets/)
  - `PUT /admin/:collection/:id` (editar entrada Nae)
  - `DELETE /admin/:collection/:id` (eliminar entrada Nae)

### FASE 3 — Frontend

> Objetivo: web navegable con las reglas oficiales y contenido de Nae.

- [ ] Crear paquete `packages/web/` con Vite + React + TS
- [ ] Vistas de reglas oficiales:
  - `/rules` — navegacion por categorias (species, classes, spells...)
  - `/rules/:category` — listado de una categoria
  - `/rules/:category/:id` — detalle con Markdown/HTML renderizado
- [ ] Vistas del mundo Nae:
  - `/nae` — home del mundo Nae
  - `/nae/species`, `/nae/locations`, `/nae/maps`
  - `/nae/:collection/:id` — detalle
- [ ] Buscador global (`/search?q=...`)
- [ ] Conexion con la API via cliente fetch

### FASE 4 — Contenido Nae y edicion (posterior)

- [ ] Definir estructura de categorias para Nae (razas caseras, regiones, ciudades, mazmorras, mapas)
- [ ] Crear primeros ejemplos (2-3 razas, 2-3 localizaciones, 1-2 mapas)
- [ ] Decidir si la edicion se hace solo via ficheros/git o tambien desde la web
- [ ] Si edicion web: formularios para masters, autenticacion basica

### FASE 5 — Mejoras futuras (opcional)

- [ ] Favoritos / marcadores
- [ ] Soporte multi-idioma
- [ ] Pre-renderizado / SSG para SEO
- [ ] Generacion de fichas de personaje
- [ ] Exportacion de BDs a JSON para backup/migracion

---

## 7. Decisiones pendientes

- [ ] **Edicion de Nae**: solo via ficheros + git entre masters, o tambien interfaz web?
- [ ] **Autenticacion**: diferencia masters vs jugadores? Login necesario ahora o en fase 4?
- [ ] **Contenido legacy SRD 5.1**: importar tambien o solo centrarse en 2024?
- [ ] **Formato body en SQLite**: guardar HTML tal cual viene de Foundry, o convertir a Markdown?

---

## 8. Documentos relacionados

| Documento | Descripcion |
|---|---|
| [`docs/arquitectura.md`](docs/arquitectura.md) | Estructura tecnica detallada del monorepo |
| [`docs/modelo-datos.md`](docs/modelo-datos.md) | Esquemas SQL (SQLite) por coleccion |
| [`docs/importacion-foundry.md`](docs/importacion-foundry.md) | Mapeo detallado YML Foundry -> SQLite |
