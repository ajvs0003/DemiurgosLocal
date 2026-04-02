# Importacion desde Foundry dnd5e

> Mapeo detallado de ficheros YML de Foundry a nuestras tablas SQLite.

---

## 1. Resumen del proceso

```txt
external/foundry-dnd5e/packs/_source/**/*.yml
        |
        v
  Script: packages/api/scripts/import-foundry.ts
        |
        | 1. Lee todos los .yml de un pack
        | 2. Parsea YAML a objeto JS
        | 3. Aplica mapeo segun tipo (species, class, spell...)
        | 4. Inserta o actualiza filas en la BD SQLite correspondiente
        | 5. FTS5 se mantiene sincronizado con triggers
        | 6. Escribe log de importacion
        v
  packages/api/db/*.db
```

---

## 2. Descubrimientos clave

### 2.1. Formato fuente

- Los ficheros fuente de Foundry en `packs/_source/` son **YAML** (`.yml`).
- Usaremos `js-yaml` para parsearlos.
- Cada fichero `.yml` representa una entrada individual de Foundry (Item, Actor o JournalEntry).

### 2.2. Estructura real relevante en Foundry 5.3.x

Contenido 2024 que vamos a importar:

| Carpeta | Tipo | Notas |
|---|---|---|
| `origins24/species/` | species | 14 especies 2024 + subcarpeta `traits/` |
| `origins24/backgrounds/` | backgrounds | trasfondos 2024 |
| `classes24/` | classes | 12 clases, una carpeta por clase |
| `spells24/` | spells | por nivel: cantrips, 1st-level ... 9th-level |
| `equipment24/` | equipment | armas, armaduras, herramientas, consumibles |
| `feats24/` | feats | dotes |
| `actors24/` | monsters | organizado por tipo de criatura |
| `content24/` | rules | capítulos, apéndices, toolbox, legal, etc. |

Observaciones confirmadas:

- `classes24/` contiene subcarpetas por clase: `fighter/`, `wizard/`, etc.
- `spells24/` está organizado por nivel.
- `actors24/` está organizado por tipo de criatura: `aberration/`, `beast/`, `dragon/`, `humanoid/`, etc.
- `content24/` está organizado por capítulos: `chapter-1/` a `chapter-7/`, `appendices/`, `dms-toolbox/`, `magic-items/`, `monsters/`.

---

## 3. Estructura comun de un fichero YML Foundry

```yaml
name: <nombre>
_id: <id unico Foundry>
type: <tipo Foundry>
img: <ruta al icono>
system:
  description:
    value: "<HTML con la descripcion completa>"
    chat: ""
  source:
    rules: "2024"
    license: "CC-BY-4.0"
    book: ""
  identifier: <slug>
folder: <id carpeta Foundry>
effects: []
flags: {}
_stats:
  systemVersion: "x.x.x"
_key: "!items!<id>"
```

### Campos comunes a extraer e insertar

| Campo Foundry | Columna SQLite | Notas |
|---|---|---|
| `name` | `name` | directo |
| `_id` | `foundry_id` | referencia al origen |
| `system.identifier` | `id` | slug principal; si no existe, generar desde `name` |
| `system.description.value` | `body` | HTML tal cual |
| `system.source.rules` | `rules_edition` | `2024` o `2014` |
| `system.source.license` | `license` | normalmente `CC-BY-4.0` |
| `img` | `image` | convertir a ruta propia o conservar temporalmente |
| constante del importador | `origin` | siempre `dnd` |
| derivado del pack | `source` | normalmente `SRD 5.2` |

---

## 4. Mapeo por coleccion

## 4.1. species.db

**Fuente**: `origins24/species/**/*.yml`

Ignorar:
- `_folder.yml`
- decidir aparte si `traits/*.yml` se importan como contenido separado o solo se referencian desde la especie

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `system.type.value` | `creature_type` | directo |
| `system.advancement` tipo `Size` | `size` | serializar `configuration.sizes` como JSON string |
| `system.movement.walk` | `speed_walk` | directo |
| `system.movement.fly` | `speed_fly` | directo |
| `system.movement.swim` | `speed_swim` | directo |
| `system.movement.climb` | `speed_climb` | directo |
| `system.movement.burrow` | `speed_burrow` | directo |
| `system.senses.darkvision` | `darkvision` | directo |
| `system.senses.blindsight` | `blindsight` | directo |
| `system.senses.tremorsense` | `tremorsense` | directo |
| `system.senses.truesight` | `truesight` | directo |
| `system.advancement` tipo `ItemGrant` / `Trait` | `traits` | extraer titulos/nombres y serializar como JSON string |
| `system.description.value` | `body` | HTML |

## 4.2. classes.db

**Fuente**: `classes24/<clase>/<clase>.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `system.hd.denomination` | `hit_die` | directo |
| `system.primaryAbility.value` | `primary_ability` | serializar array como JSON string |
| `system.advancement` trait saves | `saving_throws` | extraer grants `saves:*` |
| `system.advancement` trait skills | `skill_choices_count`, `skill_choices` | extraer count y pool |
| `system.advancement` trait armor | `armor_proficiencies` | serializar array |
| `system.advancement` trait weapon | `weapon_proficiencies` | serializar array |
| `system.spellcasting.progression` | `spellcasting` | directo |
| `system.advancement` tipo `Subclass` | `subclass_level` | extraer nivel |
| `system.advancement` tipo `ItemGrant` | `features` | serializar como JSON array de `{ level, title, uuids }` |

Notas:
- Cada carpeta de clase contiene también features y subclases. En una primera iteración importaremos solo el fichero principal de cada clase.
- Features/subclases pueden importarse después en tablas propias o dentro de `classes.db` con un campo `entry_subtype` si lo necesitamos.

## 4.3. spells.db

**Fuente**: `spells24/**/*.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `system.level` | `level` | directo |
| `system.school` | `school` | directo |
| `system.activation.type` | `casting_time` | directo |
| `system.range.value` + `system.range.units` | `range` | concatenar |
| `system.properties` | `components` | mapear a `V`, `S`, `M` y serializar array |
| `system.materials.value` | `material` | directo |
| `system.duration.*` | `duration` | convertir a texto legible |
| `system.properties` contiene `concentration` | `concentration` | 0/1 |
| `system.properties` contiene `ritual` | `ritual` | 0/1 |
| `system.activities.*.damage.parts[0]` | `damage_type`, `damage_dice` | extraer si existe |
| texto de higher level | `higher_levels` | extraer del HTML o dejar null inicialmente |

## 4.4. equipment.db

**Fuente**: `equipment24/**/*.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `type` | `equipment_type` | `weapon`, `equipment`, `tool`, `consumable`, `loot`, `container` |
| `system.weight.value` | `weight` | directo |
| `system.price.value` | `cost_value` | directo |
| `system.price.denomination` | `cost_denomination` | directo |
| `system.damage.base` | `damage_dice` | armas |
| `system.damage.types[0]` | `damage_type` | armas |
| `system.properties` | `properties` | serializar JSON array |
| `system.range.value` | `range_normal` | armas a distancia |
| `system.range.long` | `range_long` | armas a distancia |
| `system.armor.value` | `ac_base` | armaduras |

## 4.5. feats.db

**Fuente**: `feats24/**/*.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `system.type.subtype` | `feat_type` | origin, general, fightingStyle, epicBoon |
| `system.prerequisites` | `prerequisite` | texto libre o serializado |
| `system.properties.repeatable` | `repeatable` | 0/1 si existe |

## 4.6. backgrounds.db

**Fuente**: `origins24/backgrounds/**/*.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` | `id` | directo |
| `name` | `name` | directo |
| `system.advancement` skills | `skill_proficiencies` | serializar array |
| `system.advancement` tools | `tool_proficiencies` | serializar array |
| `system.advancement` feat | `feat` | id o uuid referenciado |
| `system.description.value` | `body` | HTML |

## 4.7. monsters.db

**Fuente**: `actors24/**/*.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` o slug derivado | `id` | si no existe, generar slug desde `name` |
| `name` | `name` | directo |
| `system.details.type.value` | `creature_type` | beast, fiend, undead... |
| `system.traits.size` | `size` | tiny, sm, med, lg... |
| `system.details.alignment` | `alignment` | directo |
| `system.attributes.ac.value` | `armor_class` | directo |
| `system.attributes.hp` | `hit_points` | convertir a texto legible |
| `system.attributes.movement.*` | `speed_*` | directo |
| `system.abilities.*.value` | `str`, `dex`, `con`, `int_score`, `wis`, `cha` | directo |
| `system.details.cr` | `challenge_rating` | directo |
| `system.details.xp.value` | `xp` | directo |

## 4.8. rules.db

**Fuente**: `content24/**/*.yml`

Contenido confirmado:
- `chapter-1` a `chapter-7`
- `appendices`
- `dms-toolbox`
- `magic-items`
- `monsters`
- ficheros sueltos como `disclaimer.yml`, `legal-information.yml`

| Campo Foundry | Columna SQLite | Logica |
|---|---|---|
| `system.identifier` o slug derivado | `id` | generar si no existe |
| `name` | `name` | directo |
| carpeta padre | `rule_category` | chapter-1, appendices, etc. |
| jerarquia detectada | `parent_rule` | opcional |
| `system.description.value` o equivalente | `body` | HTML/texto |

---

## 5. Script de importacion

### Ubicacion

`packages/api/scripts/import-foundry.ts`

### Pseudocodigo

```ts
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Database from "better-sqlite3";

const FOUNDRY_ROOT = path.resolve("../../external/foundry-dnd5e/packs/_source");
const DB_ROOT = path.resolve("../db");

const IMPORT_MAP = [
  { source: "origins24/species", collection: "species", mapper: mapSpecies },
  { source: "origins24/backgrounds", collection: "backgrounds", mapper: mapBackground },
  { source: "classes24", collection: "classes", mapper: mapClass },
  { source: "spells24", collection: "spells", mapper: mapSpell },
  { source: "equipment24", collection: "equipment", mapper: mapEquipment },
  { source: "feats24", collection: "feats", mapper: mapFeat },
  { source: "actors24", collection: "monsters", mapper: mapMonster },
  { source: "content24", collection: "rules", mapper: mapRule }
];

for (const pack of IMPORT_MAP) {
  const db = openDatabase(path.join(DB_ROOT, `${pack.collection}.db`));
  const files = listYmlFiles(path.join(FOUNDRY_ROOT, pack.source))
    .filter(f => !f.endsWith("_folder.yml"));

  for (const file of files) {
    const raw = yaml.load(fs.readFileSync(file, "utf8"));
    const row = pack.mapper(raw, file);
    if (!row) continue;
    upsertRow(db, pack.collection, row);
  }
}
```

### Notas importantes

1. Ignorar `_folder.yml`.
2. Para `classes24`, en la primera pasada importar solo el fichero principal de cada clase.
3. Para `traits/` de especies, de momento no crear tabla propia; solo extraer nombres de rasgos para la especie.
4. Limpiar referencias Foundry como `@UUID[...]` y `@Embed[...]` o dejarlas marcadas para una fase posterior.
5. Guardar `body` como HTML de Foundry inicialmente para no perder estructura.
6. Generar `summary` a partir del primer párrafo significativo.
7. Generar `tags` según tipo, escuela, criatura, etc.
8. Todas las filas importadas desde Foundry llevan `origin = 'dnd'`.

---

## 6. Estrategia de origen: DnD vs Nae

Cada BD puede contener tanto contenido oficial como homebrew:

- `origin = 'dnd'` → importado desde Foundry.
- `origin = 'nae'` → creado por masters desde la API o importado desde `.md`.

Ejemplo:

- `species.db` contendrá `Human`, `Dwarf`, `Elf High` con `origin='dnd'`.
- Esa misma `species.db` podrá contener `Aeolian`, `Crystalkin` con `origin='nae'`.

Esto evita duplicar estructura y simplifica filtros y búsquedas.

---

## 7. Log esperado

```txt
[import] Starting import from external/foundry-dnd5e/packs/_source
[import] Species: 14 entries imported into species.db
[import] Classes: 12 entries imported into classes.db
[import] Spells: ~300 entries imported into spells.db
[import] Equipment: ~200 entries imported into equipment.db
[import] Feats: ~80 entries imported into feats.db
[import] Backgrounds: ~16 entries imported into backgrounds.db
[import] Monsters: ~400 entries imported into monsters.db
[import] Rules: chapters and appendices imported into rules.db
[import] SQLite databases updated for 8 collections
[import] Done.
```
