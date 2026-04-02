# Arquitectura tecnica del monorepo

> Detalle de la estructura tecnica, tecnologias y configuracion del monorepo.

---

## 1. Stack tecnologico

| Capa | Tecnologia | Version minima |
|---|---|---|
| Monorepo | pnpm + workspaces | pnpm 9.x |
| Frontend | React + TypeScript + Vite | React 19, Vite 6 |
| Backend | Node.js + TypeScript + Express | Node 20 LTS, Express 4.x |
| Base de datos | SQLite via better-sqlite3 | 11.x |
| Busqueda | FTS5 (nativo de SQLite) | — |
| Renderizado MD | react-markdown + remark-gfm | ultimas |
| Parseo YAML | js-yaml | 4.x |
| Parseo frontmatter MD | gray-matter | 4.x |

---

## 2. Estructura completa de directorios

```
DemiurgosLocal/
├── .gitignore
├── package.json                    # Raiz del monorepo
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── planificacion-del-proyecto.md
│
├── docs/
│   ├── arquitectura.md             # (este fichero)
│   ├── modelo-datos.md
│   └── importacion-foundry.md
│
├── external/                       # Fuentes externas (gitignored)
│   └── foundry-dnd5e/              # Clon de https://github.com/foundryvtt/dnd5e
│       └── packs/_source/          # YAMLs fuente
│           ├── origins24/
│           │   ├── species/        # 14 especies 2024
│           │   └── backgrounds/    # Trasfondos 2024
│           ├── classes24/          # 12 clases (carpeta por clase)
│           │   ├── barbarian/
│           │   ├── bard/
│           │   ├── cleric/
│           │   ├── druid/
│           │   ├── fighter/
│           │   ├── monk/
│           │   ├── paladin/
│           │   ├── ranger/
│           │   ├── rogue/
│           │   ├── sorcerer/
│           │   ├── warlock/
│           │   └── wizard/
│           ├── spells24/           # Hechizos por nivel
│           │   ├── cantrips/
│           │   ├── 1st-level/
│           │   ├── 2nd-level/
│           │   ├── ... hasta 9th-level/
│           │   └── supplemental-items/
│           ├── equipment24/        # Equipo 2024
│           ├── feats24/            # Dotes 2024
│           ├── content24/          # Reglas generales (JournalEntry)
│           ├── actors24/           # Monstruos / NPCs
│           ├── monsterfeatures24/  # Rasgos de monstruos
│           └── tables24/           # Tablas de tiradas
│
└── packages/
    ├── api/                        # Backend
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── src/
    │   │   ├── index.ts            # Punto de entrada Express
    │   │   ├── routes/
    │   │   │   ├── rules.ts        # Endpoints de reglas oficiales
    │   │   │   ├── nae.ts          # Endpoints del mundo Nae
    │   │   │   ├── search.ts       # Endpoint de busqueda
    │   │   │   └── admin.ts        # Endpoints de administracion
    │   │   ├── services/
    │   │   │   ├── database.ts     # Gestion de conexiones SQLite (better-sqlite3)
    │   │   │   ├── searchService.ts# Busqueda FTS5 cruzada en todas las BDs
    │   │   │   └── mdParser.ts     # Parseo de .md con frontmatter
    │   │   └── types/
    │   │       └── index.ts        # Tipos TypeScript compartidos
    │   ├── scripts/
    │   │   └── import-foundry.ts   # Script de importacion YML -> SQLite
    │   ├── db/                     # Ficheros SQLite (un .db por coleccion)
    │   │   ├── species.db         # Razas/especies (DnD + Nae, campo origin)
    │   │   ├── classes.db         # Clases
    │   │   ├── spells.db          # Hechizos
    │   │   ├── equipment.db       # Equipo
    │   │   ├── feats.db           # Dotes
    │   │   ├── backgrounds.db     # Trasfondos
    │   │   ├── monsters.db        # Monstruos
    │   │   └── rules.db           # Reglas generales
    │   └── assets/
    │       └── images/
    │
    ├── web/                        # Frontend
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   ├── public/
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── api/                # Cliente API
    │       │   └── client.ts
    │       ├── pages/
    │       │   ├── Home.tsx
    │       │   ├── rules/
    │       │   │   ├── RulesList.tsx
    │       │   │   └── RuleDetail.tsx
    │       │   ├── nae/
    │       │   │   ├── NaeHome.tsx
    │       │   │   ├── NaeList.tsx
    │       │   │   └── NaeDetail.tsx
    │       │   └── Search.tsx
    │       └── components/
    │           ├── MarkdownRenderer.tsx
    │           ├── Navigation.tsx
    │           └── SearchBar.tsx
    │
    └── shared/                     # (opcional) tipos compartidos
        ├── package.json
        └── src/
            └── types.ts
```

---

## 3. Configuracion raiz del monorepo

### package.json (raiz)

```json
{
  "name": "nae-dnd5e-monorepo",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "dev": "pnpm run dev:api & pnpm run dev:web",
    "build": "pnpm -r build",
    "import:foundry": "pnpm --filter api run import:foundry"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "packages/*"
```

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "baseUrl": "./"
  }
}
```

### .gitignore (elementos relevantes)

```
node_modules/
dist/
external/
packages/api/db/             # BDs SQLite regenerables/importables
packages/api/assets/images/  # Imagenes subidas
*.log
.env
```

> Nota: si el contenido de Nae se gestiona via API, las BDs SQLite y/o exports de backup deberan versionarse segun la estrategia que decidamos.

---

## 4. Flujo de datos

```
┌─────────────────────────────────┐
│  Foundry dnd5e (external/)      │
│  packs/_source/**/*.yml         │
└──────────────┬──────────────────┘
               │ Script import-foundry.ts
               v
┌─────────────────────────────────┐
│  packages/api/db/*.db           │
│  SQLite con FTS5                │
└──────────────┬──────────────────┘
               │ API Express (lectura)
               v
┌─────────────────────────────────┐    ┌──────────────────┐
│  GET /species                   │<───│  packages/web/   │
│  GET /classes                   │    │  React + Vite    │
│  GET /spells                    │    │  fetch() -> API  │
│  GET /search?q=...              │    └──────────────────┘
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Master sube .md + imagenes     │
└──────────────┬──────────────────┘
               │ POST /admin/import-md
               v
┌─────────────────────────────────┐
│  INSERT en SQLite origin="nae"  │
│  FTS5 se actualiza automatico   │
└─────────────────────────────────┘
```

---

## 5. Endpoints de la API (resumen)

### Publicos (lectura)

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/species` | Lista especies. Acepta `?origin=dnd\|nae` |
| GET | `/species/:id` | Detalle de una especie |
| GET | `/classes` | Lista clases. Acepta `?origin=dnd\|nae` |
| GET | `/classes/:id` | Detalle de una clase |
| GET | `/spells` | Lista hechizos. Acepta `?level=X&school=X&origin=X` |
| GET | `/spells/:id` | Detalle de un hechizo |
| GET | `/equipment` | Lista equipo. Acepta `?type=weapon\|armor\|...` |
| GET | `/equipment/:id` | Detalle de equipo |
| GET | `/feats` | Lista dotes. Acepta `?origin=dnd\|nae` |
| GET | `/feats/:id` | Detalle de una dote |
| GET | `/backgrounds` | Lista trasfondos. Acepta `?origin=dnd\|nae` |
| GET | `/backgrounds/:id` | Detalle de trasfondo |
| GET | `/monsters` | Lista monstruos. Acepta `?origin=dnd\|nae` |
| GET | `/monsters/:id` | Detalle de monstruo |
| GET | `/rules` | Lista reglas generales. Acepta `?origin=dnd\|nae` |
| GET | `/rules/:id` | Detalle de una regla |
| GET | `/search?q=...` | Busqueda FTS5 cruzada en todas las BDs |
| GET | `/assets/images/*` | Imagenes estaticas |

### Administracion (masters)

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/admin/import-md` | Subir .md -> parsear frontmatter -> INSERT en SQLite con origin="nae" |
| POST | `/admin/upload-image` | Subir imagen a assets/ |
| PUT | `/admin/:collection/:id` | Editar entrada Nae |
| DELETE | `/admin/:collection/:id` | Eliminar entrada Nae |

---

## 6. Dependencias clave por paquete

### packages/api

```
dependencies:
  express
  cors
  better-sqlite3
  js-yaml         # para el script importador
  gray-matter     # para parsear .md con frontmatter
  multer          # para upload de ficheros

devDependencies:
  typescript
  ts-node-dev     # dev server con hot reload
  @types/express
  @types/multer
  @types/cors
```

### packages/web

```
dependencies:
  react
  react-dom
  react-router-dom
  react-markdown
  remark-gfm

devDependencies:
  typescript
  vite
  @vitejs/plugin-react
  @types/react
  @types/react-dom
```
