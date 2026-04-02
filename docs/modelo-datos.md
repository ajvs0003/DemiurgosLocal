# Modelo de datos - Esquemas SQLite por coleccion

> Define la estructura de las tablas SQLite que el backend usa para almacenar y servir datos.

---

## 1. Principios generales

- **Un fichero `.db` por coleccion** en `packages/api/db/`.
- Cada BD contiene una **tabla principal** + una **tabla FTS5** para busqueda full-text.
- Cada entrada tiene un campo `origin` (`"dnd"` u `"nae"`) para distinguir contenido oficial de homebrew.
- El campo `body` contiene HTML (Foundry) o Markdown (contenido Nae subido por masters).
- Libreria: `better-sqlite3` (sincrona, rapida, sin dependencias nativas complejas).

---

## 2. Ficheros de base de datos

```
packages/api/db/
├── species.db          # Razas/especies (DnD + Nae)
├── classes.db          # Clases, subclases
├── spells.db           # Hechizos
├── equipment.db        # Armas, armaduras, herramientas, consumibles
├── feats.db            # Dotes
├── backgrounds.db      # Trasfondos
├── monsters.db         # Monstruos / NPCs
└── rules.db            # Reglas generales (texto del manual)
```

---

## 3. Campos comunes a todas las tablas

Todas las tablas comparten estas columnas base:

```sql
-- Columnas comunes presentes en TODAS las tablas
id            TEXT PRIMARY KEY,     -- slug unico (ej: "human", "fighter", "magic-missile")
foundry_id    TEXT,                 -- ID original de Foundry (ej: "phbspHuman000000"), NULL para Nae
name          TEXT NOT NULL,        -- nombre legible
origin        TEXT NOT NULL DEFAULT 'dnd',  -- "dnd" | "nae"
source        TEXT,                 -- "SRD 5.1" | "SRD 5.2" | "Nae"
license       TEXT,                 -- "CC-BY-4.0" | "custom"
rules_edition TEXT,                 -- "2014" | "2024" | "homebrew"
tags          TEXT,                 -- JSON array como texto: '["humanoid","versatile"]'
summary       TEXT,                 -- descripcion corta para listados
body          TEXT,                 -- contenido completo (HTML o Markdown)
body_format   TEXT DEFAULT 'html',  -- "html" | "markdown"
image         TEXT,                 -- ruta relativa a imagen
created_at    TEXT DEFAULT (datetime('now')),
updated_at    TEXT DEFAULT (datetime('now'))
```

---

## 4. species.db — Razas / Especies

```sql
CREATE TABLE IF NOT EXISTS species (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de species
  creature_type TEXT,          -- "humanoid", "fey", etc.
  size          TEXT,          -- JSON array: '["sm","med"]'
  speed_walk    INTEGER,
  speed_fly     INTEGER,
  speed_swim    INTEGER,
  speed_climb   INTEGER,
  speed_burrow  INTEGER,
  darkvision    INTEGER,       -- distancia en pies, NULL si no tiene
  blindsight    INTEGER,
  tremorsense   INTEGER,
  truesight     INTEGER,
  traits        TEXT           -- JSON array de nombres de rasgos: '["Resourceful","Skillful","Versatile"]'
);

-- Full-Text Search
CREATE VIRTUAL TABLE IF NOT EXISTS species_fts USING fts5(
  id, name, tags, summary, body,
  content=species, content_rowid=rowid
);

-- Triggers para mantener FTS sincronizado
CREATE TRIGGER IF NOT EXISTS species_ai AFTER INSERT ON species BEGIN
  INSERT INTO species_fts(rowid, id, name, tags, summary, body)
  VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
END;

CREATE TRIGGER IF NOT EXISTS species_ad AFTER DELETE ON species BEGIN
  INSERT INTO species_fts(species_fts, rowid, id, name, tags, summary, body)
  VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
END;

CREATE TRIGGER IF NOT EXISTS species_au AFTER UPDATE ON species BEGIN
  INSERT INTO species_fts(species_fts, rowid, id, name, tags, summary, body)
  VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
  INSERT INTO species_fts(rowid, id, name, tags, summary, body)
  VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
END;
```

**Ejemplo de fila:**

| id | name | origin | creature_type | size | speed_walk | darkvision | traits |
|---|---|---|---|---|---|---|---|
| human | Human | dnd | humanoid | ["sm","med"] | 30 | NULL | ["Resourceful","Skillful","Versatile"] |
| elf-high | High Elf | dnd | humanoid | ["med"] | 30 | 60 | ["Darkvision","Fey Ancestry","Keen Senses","Trance"] |

---

## 5. classes.db — Clases

```sql
CREATE TABLE IF NOT EXISTS classes (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de class
  hit_die             TEXT,    -- "d10", "d8", etc.
  primary_ability     TEXT,    -- JSON array: '["str","dex"]'
  saving_throws       TEXT,    -- JSON array: '["str","con"]'
  skill_choices_count INTEGER, -- cuantas skills puede elegir
  skill_choices       TEXT,    -- JSON array de opciones
  armor_proficiencies TEXT,    -- JSON array: '["lgt","med","hvy","shl"]'
  weapon_proficiencies TEXT,   -- JSON array: '["sim","mar"]'
  spellcasting        TEXT,    -- "none" | "full" | "half" | "pact" | "third"
  subclass_level      INTEGER, -- nivel al que elige subclase
  features            TEXT     -- JSON array: '[{"level":1,"name":"Fighting Style"},...]'
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS classes_fts USING fts5(
  id, name, tags, summary, body,
  content=classes, content_rowid=rowid
);
```

---

## 6. spells.db — Hechizos

```sql
CREATE TABLE IF NOT EXISTS spells (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de spell
  level           INTEGER NOT NULL, -- 0 = cantrip, 1-9
  school          TEXT,             -- "evo", "abj", "con", "div", "enc", "ill", "nec", "tra"
  casting_time    TEXT,             -- "action", "bonus action", "reaction", "1 minute"
  range           TEXT,             -- "120 ft", "Self", "Touch"
  components      TEXT,             -- JSON array: '["V","S"]'
  material        TEXT,             -- texto del componente material
  duration        TEXT,             -- "Instantaneous", "1 hour", "Concentration, up to 1 minute"
  concentration   INTEGER DEFAULT 0,-- 0 o 1
  ritual          INTEGER DEFAULT 0,-- 0 o 1
  damage_type     TEXT,             -- "force", "fire", "radiant", etc.
  damage_dice     TEXT,             -- "1d4+1", "8d6"
  higher_levels   TEXT              -- texto de "Using a Higher-Level Spell Slot"
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS spells_fts USING fts5(
  id, name, tags, summary, body, school,
  content=spells, content_rowid=rowid
);
```

---

## 7. equipment.db — Equipo

```sql
CREATE TABLE IF NOT EXISTS equipment (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de equipment
  equipment_type  TEXT,    -- "weapon", "armor", "tool", "consumable", "loot", "container"
  weight          REAL,
  cost_value      REAL,
  cost_denomination TEXT,  -- "gp", "sp", "cp"
  damage_dice     TEXT,    -- para armas: "1d8"
  damage_type     TEXT,    -- para armas: "slashing"
  properties      TEXT,    -- JSON array: '["finesse","light","thrown"]'
  range_normal    INTEGER,
  range_long      INTEGER,
  ac_base         INTEGER, -- para armaduras
  ac_dex_bonus    INTEGER DEFAULT 1, -- 0 o 1
  ac_max_bonus    INTEGER, -- max dex bonus para armaduras medias
  strength_req    INTEGER, -- requisito de fuerza
  stealth_disadv  INTEGER DEFAULT 0  -- 0 o 1
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS equipment_fts USING fts5(
  id, name, tags, summary, body, equipment_type,
  content=equipment, content_rowid=rowid
);
```

---

## 8. feats.db — Dotes

```sql
CREATE TABLE IF NOT EXISTS feats (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de feat
  feat_type     TEXT,    -- "origin", "general", "fightingStyle", "epicBoon"
  prerequisite  TEXT,    -- texto libre del prerrequisito
  repeatable    INTEGER DEFAULT 0  -- 0 o 1
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS feats_fts USING fts5(
  id, name, tags, summary, body, feat_type,
  content=feats, content_rowid=rowid
);
```

---

## 9. backgrounds.db — Trasfondos

```sql
CREATE TABLE IF NOT EXISTS backgrounds (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de background
  skill_proficiencies TEXT,  -- JSON array
  tool_proficiencies  TEXT,  -- JSON array
  languages           INTEGER,-- numero de idiomas extra
  feat                TEXT,  -- id de la dote que otorga
  starting_equipment  TEXT   -- descripcion del equipo inicial
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS backgrounds_fts USING fts5(
  id, name, tags, summary, body,
  content=backgrounds, content_rowid=rowid
);
```

---

## 10. monsters.db — Monstruos / NPCs

```sql
CREATE TABLE IF NOT EXISTS monsters (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de monster
  creature_type TEXT,       -- "beast", "fiend", "undead", etc.
  size          TEXT,       -- "tiny", "sm", "med", "lg", "huge", "grg"
  alignment     TEXT,
  armor_class   INTEGER,
  hit_points    TEXT,       -- "52 (8d8 + 16)"
  speed_walk    INTEGER,
  speed_fly     INTEGER,
  speed_swim    INTEGER,
  speed_climb   INTEGER,
  speed_burrow  INTEGER,
  str           INTEGER,
  dex           INTEGER,
  con           INTEGER,
  int_score     INTEGER,    -- "int" es palabra reservada
  wis           INTEGER,
  cha           INTEGER,
  challenge_rating TEXT,    -- "1/4", "1", "5", "20"
  xp            INTEGER
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
  id, name, tags, summary, body, creature_type,
  content=monsters, content_rowid=rowid
);
```

---

## 11. rules.db — Reglas generales

```sql
CREATE TABLE IF NOT EXISTS rules (
  -- Comunes
  id            TEXT PRIMARY KEY,
  foundry_id    TEXT,
  name          TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'dnd',
  source        TEXT,
  license       TEXT,
  rules_edition TEXT,
  tags          TEXT,
  summary       TEXT,
  body          TEXT,
  body_format   TEXT DEFAULT 'html',
  image         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),

  -- Especificos de rules
  rule_category TEXT,  -- "combat", "exploration", "social", "rest", "general", etc.
  parent_rule   TEXT   -- id de la regla padre (para jerarquia de secciones)
);

-- FTS
CREATE VIRTUAL TABLE IF NOT EXISTS rules_fts USING fts5(
  id, name, tags, summary, body, rule_category,
  content=rules, content_rowid=rowid
);
```

---

## 12. Consultas utiles de referencia

### Listar todas las especies DnD oficiales
```sql
SELECT id, name, creature_type, size, speed_walk, darkvision, image
FROM species WHERE origin = 'dnd' ORDER BY name;
```

### Listar especies Nae
```sql
SELECT id, name, creature_type, size, speed_walk, image
FROM species WHERE origin = 'nae' ORDER BY name;
```

### Buscar hechizos por nombre (FTS5)
```sql
SELECT id, name, level, school, summary
FROM spells WHERE id IN (
  SELECT id FROM spells_fts WHERE spells_fts MATCH 'fire*'
) ORDER BY level, name;
```

### Buscar en TODAS las colecciones (para endpoint /search)
```sql
-- Desde la API, ejecutar esta consulta en cada .db y combinar resultados:
SELECT id, name, summary, 'species' AS collection
FROM species_fts WHERE species_fts MATCH ?
UNION ALL
SELECT id, name, summary, 'spells' AS collection
FROM spells_fts WHERE spells_fts MATCH ?
-- ... etc. para cada coleccion
```

### Filtrar hechizos por nivel y escuela
```sql
SELECT id, name, level, school, casting_time, range, concentration
FROM spells
WHERE level = 1 AND school = 'evo'
ORDER BY name;
```

---

## 13. TypeScript interfaces (para la API)

Estas interfaces representan los objetos que la API devuelve al frontend:

```typescript
// Respuesta de listado (comun a todos los endpoints GET /:collection)
interface ListResponse<T> {
  total: number;
  origin?: string;       // filtro aplicado
  items: T[];
}

// Respuesta de busqueda (GET /search)
interface SearchResult {
  id: string;
  name: string;
  summary: string;
  collection: string;    // "species", "spells", "classes", etc.
  origin: string;        // "dnd" | "nae"
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}
```
