import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Database from "better-sqlite3";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "../../..");
const FOUNDRY_SRC = path.join(ROOT, "external", "foundry-dnd5e", "packs", "_source");
const DB_ROOT = path.join(ROOT, "packages", "api", "db");

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSummary(html: string): string {
  const text = stripHtml(html);
  return text.slice(0, 220).trim();
}

function listYmlFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listYmlFilesRecursive(fullPath));
    } else if (entry.name.endsWith(".yml") && entry.name !== "_folder.yml") {
      results.push(fullPath);
    }
  }
  return results;
}

function listYmlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yml") && entry.name !== "_folder.yml")
    .map((entry) => path.join(dir, entry.name));
}

function resetDb(name: string): void {
  const dbPath = path.join(DB_ROOT, name);
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  for (const filePath of [dbPath, walPath, shmPath]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function openDb(name: string): Database.Database {
  if (!fs.existsSync(DB_ROOT)) fs.mkdirSync(DB_ROOT, { recursive: true });
  const db = new Database(path.join(DB_ROOT, name));
  db.pragma("journal_mode = WAL");
  return db;
}

// ---------------------------------------------------------------------------
// XP table for monster CR
// ---------------------------------------------------------------------------

const CR_TO_XP: Record<string, number> = {
  "0": 10, "1/8": 25, "0.125": 25, "1/4": 50, "0.25": 50, "1/2": 100, "0.5": 100,
  "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900,
  "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
  "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000, "21": 33000,
  "22": 41000, "23": 50000, "24": 62000, "25": 75000, "26": 90000, "27": 105000,
  "28": 120000, "29": 135000, "30": 155000,
};

function formatCR(cr: number | string | null | undefined): string {
  if (cr === null || cr === undefined) return "0";
  const n = Number(cr);
  if (n < 0.2) return "1/8";
  if (n < 0.4) return "1/4";
  if (n < 0.7) return "1/2";
  return String(Math.round(n));
}

function crToXp(cr: number | string | null | undefined): number {
  const key = formatCR(cr);
  return CR_TO_XP[key] ?? CR_TO_XP[String(cr)] ?? 0;
}

// ---------------------------------------------------------------------------
// Spell damage helper
// ---------------------------------------------------------------------------

function extractSpellDamage(
  activities: Record<string, unknown> | undefined
): { damage_type: string | null; damage_dice: string | null } {
  if (!activities) return { damage_type: null, damage_dice: null };
  for (const act of Object.values(activities)) {
    const a = act as Record<string, unknown> | null | undefined;
    const parts = (a?.damage as Record<string, unknown> | undefined)?.parts;
    if (Array.isArray(parts) && parts.length > 0) {
      const p = parts[0] as Record<string, unknown> | null | undefined;
      const num = (p?.number as number | null | undefined) ?? 1;
      const den = Number(p?.denomination ?? 0);
      const types = p?.types;
      if (den > 0) {
        return {
          damage_dice: `${num}d${den}`,
          damage_type: Array.isArray(types) && types.length > 0 ? String(types[0]) : null,
        };
      }
    }
  }
  return { damage_type: null, damage_dice: null };
}

// ===========================================================================
// SPECIES
// ===========================================================================

type SpeciesRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  creature_type: string | null;
  size: string;
  speed_walk: number | null;
  speed_fly: number | null;
  speed_swim: number | null;
  speed_climb: number | null;
  speed_burrow: number | null;
  darkvision: number | null;
  blindsight: number | null;
  tremorsense: number | null;
  truesight: number | null;
  traits: string;
};

function ensureSchema_species(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS species (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      creature_type TEXT,
      size TEXT,
      speed_walk INTEGER,
      speed_fly INTEGER,
      speed_swim INTEGER,
      speed_climb INTEGER,
      speed_burrow INTEGER,
      darkvision INTEGER,
      blindsight INTEGER,
      tremorsense INTEGER,
      truesight INTEGER,
      traits TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS species_fts USING fts5(
      id, name, tags, summary, body,
      content='species', content_rowid='rowid'
    );

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
  `);
}

function extractTraits(advancement: unknown[] | undefined): string[] {
  if (!Array.isArray(advancement)) return [];
  return advancement
    .map((item) => (item as Record<string, unknown>)?.title)
    .filter((value): value is string => Boolean(value && String(value).trim()));
}

function extractSize(advancement: unknown[] | undefined): string[] {
  if (!Array.isArray(advancement)) return [];
  const sizeNode = advancement.find(
    (item) => (item as Record<string, unknown>)?.type === "Size"
  ) as Record<string, unknown> | undefined;
  const sizes = (sizeNode?.configuration as Record<string, unknown> | undefined)?.sizes;
  return Array.isArray(sizes) ? sizes : [];
}

function map_species(raw: Record<string, unknown>): SpeciesRow {
  const body = (raw?.system as Record<string, unknown> | undefined)
    ? ((raw.system as Record<string, unknown>).description as Record<string, unknown> | undefined)?.value as string ?? ""
    : "";
  const sys = raw?.system as Record<string, unknown> | undefined;
  const advancement = (sys?.advancement as unknown[] | undefined);

  const tags = [
    (sys?.type as Record<string, unknown> | undefined)?.value,
    (sys?.source as Record<string, unknown> | undefined)?.rules === "2024" ? "2024" : null,
    ...extractTraits(advancement),
  ].filter(Boolean) as string[];

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: (sys?.source as Record<string, unknown> | undefined)?.rules === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: ((sys?.source as Record<string, unknown> | undefined)?.rules as string | null | undefined) ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    creature_type: (sys?.type as Record<string, unknown> | undefined)?.value as string | null ?? null,
    size: JSON.stringify(extractSize(advancement)),
    speed_walk: (sys?.movement as Record<string, unknown> | undefined)?.walk as number | null ?? null,
    speed_fly: (sys?.movement as Record<string, unknown> | undefined)?.fly as number | null ?? null,
    speed_swim: (sys?.movement as Record<string, unknown> | undefined)?.swim as number | null ?? null,
    speed_climb: (sys?.movement as Record<string, unknown> | undefined)?.climb as number | null ?? null,
    speed_burrow: (sys?.movement as Record<string, unknown> | undefined)?.burrow as number | null ?? null,
    darkvision: (sys?.senses as Record<string, unknown> | undefined)?.darkvision as number | null ?? null,
    blindsight: (sys?.senses as Record<string, unknown> | undefined)?.blindsight as number | null ?? null,
    tremorsense: (sys?.senses as Record<string, unknown> | undefined)?.tremorsense as number | null ?? null,
    truesight: (sys?.senses as Record<string, unknown> | undefined)?.truesight as number | null ?? null,
    traits: JSON.stringify(extractTraits(advancement)),
  };
}

function upsert_species(db: Database.Database, row: SpeciesRow): void {
  db.prepare(`
    INSERT INTO species (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      creature_type, size,
      speed_walk, speed_fly, speed_swim, speed_climb, speed_burrow,
      darkvision, blindsight, tremorsense, truesight, traits, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @creature_type, @size,
      @speed_walk, @speed_fly, @speed_swim, @speed_climb, @speed_burrow,
      @darkvision, @blindsight, @tremorsense, @truesight, @traits, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      creature_type = excluded.creature_type,
      size = excluded.size,
      speed_walk = excluded.speed_walk,
      speed_fly = excluded.speed_fly,
      speed_swim = excluded.speed_swim,
      speed_climb = excluded.speed_climb,
      speed_burrow = excluded.speed_burrow,
      darkvision = excluded.darkvision,
      blindsight = excluded.blindsight,
      tremorsense = excluded.tremorsense,
      truesight = excluded.truesight,
      traits = excluded.traits,
      updated_at = datetime('now');
  `).run(row);
}

function importSpecies(): void {
  resetDb("species.db");
  const db = openDb("species.db");
  ensureSchema_species(db);
  const files = listYmlFiles(path.join(FOUNDRY_SRC, "origins24", "species"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const row = map_species(raw);
      upsert_species(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:species] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM species").get() as { total: number };
  db.close();
  console.log(`[import:species] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// TRAITS
// ===========================================================================

type TraitRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  trait_type: string | null;
  species: string | null;
  requirement: string | null;
  repeatable: number;
};

function ensureSchema_traits(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS traits (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      trait_type TEXT,
      species TEXT,
      requirement TEXT,
      repeatable INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS traits_fts USING fts5(
      id, name, tags, summary, body, trait_type, species,
      content='traits', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS traits_ai AFTER INSERT ON traits BEGIN
      INSERT INTO traits_fts(rowid, id, name, tags, summary, body, trait_type, species)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.trait_type, new.species);
    END;

    CREATE TRIGGER IF NOT EXISTS traits_ad AFTER DELETE ON traits BEGIN
      INSERT INTO traits_fts(traits_fts, rowid, id, name, tags, summary, body, trait_type, species)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.trait_type, old.species);
    END;

    CREATE TRIGGER IF NOT EXISTS traits_au AFTER UPDATE ON traits BEGIN
      INSERT INTO traits_fts(traits_fts, rowid, id, name, tags, summary, body, trait_type, species)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.trait_type, old.species);
      INSERT INTO traits_fts(rowid, id, name, tags, summary, body, trait_type, species)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.trait_type, new.species);
    END;
  `);
}

function deriveTraitSpecies(filePath: string): string | null {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const match = normalizedPath.match(/origins24\/species\/traits\/([^/]+)\//);
  return match ? match[1] : null;
}

function map_trait(raw: Record<string, unknown>, filePath: string): TraitRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;
  const typeObj = sys?.type as Record<string, unknown> | undefined;
  const prereqs = sys?.prerequisites as Record<string, unknown> | undefined;
  const species = deriveTraitSpecies(filePath);
  const traitType = typeObj?.subtype as string | undefined ?? typeObj?.value as string | undefined ?? null;
  const requirement = sys?.requirements as string | null | undefined ?? null;
  const repeatable = prereqs?.repeatable ? 1 : 0;

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);
  if (species) tags.push(species);
  if (traitType) tags.push(traitType);

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    trait_type: traitType,
    species,
    requirement,
    repeatable,
  };
}

function upsert_trait(db: Database.Database, row: TraitRow): void {
  db.prepare(`
    INSERT INTO traits (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      trait_type, species, requirement, repeatable, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @trait_type, @species, @requirement, @repeatable, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      trait_type = excluded.trait_type,
      species = excluded.species,
      requirement = excluded.requirement,
      repeatable = excluded.repeatable,
      updated_at = datetime('now');
  `).run(row);
}

function importTraits(): void {
  resetDb("traits.db");
  const db = openDb("traits.db");
  ensureSchema_traits(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "origins24", "species", "traits"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "feat") continue;
      const row = map_trait(raw, file);
      upsert_trait(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:traits] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM traits").get() as { total: number };
  db.close();
  console.log(`[import:traits] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// CLASSES
// ===========================================================================

type ClassRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  hit_die: string | null;
  primary_ability: string;
  saving_throws: string;
  skill_choices_count: number;
  skill_choices: string;
  armor_proficiencies: string;
  weapon_proficiencies: string;
  spellcasting: string | null;
  subclass_level: number | null;
  features: string;
};

function ensureSchema_classes(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      hit_die TEXT,
      primary_ability TEXT,
      saving_throws TEXT,
      skill_choices_count INTEGER,
      skill_choices TEXT,
      armor_proficiencies TEXT,
      weapon_proficiencies TEXT,
      spellcasting TEXT,
      subclass_level INTEGER,
      features TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS classes_fts USING fts5(
      id, name, tags, summary, body,
      content='classes', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS classes_ai AFTER INSERT ON classes BEGIN
      INSERT INTO classes_fts(rowid, id, name, tags, summary, body)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
    END;

    CREATE TRIGGER IF NOT EXISTS classes_ad AFTER DELETE ON classes BEGIN
      INSERT INTO classes_fts(classes_fts, rowid, id, name, tags, summary, body)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
    END;

    CREATE TRIGGER IF NOT EXISTS classes_au AFTER UPDATE ON classes BEGIN
      INSERT INTO classes_fts(classes_fts, rowid, id, name, tags, summary, body)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
      INSERT INTO classes_fts(rowid, id, name, tags, summary, body)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
    END;
  `);
}

function extractClassTraits(
  advancement: unknown[] | undefined,
  grantType: string,
  prefix: string
): string[] {
  if (!Array.isArray(advancement)) return [];
  const results: string[] = [];
  for (const adv of advancement) {
    const a = adv as Record<string, unknown>;
    if (a?.type !== grantType) continue;
    const cfg = a?.configuration as Record<string, unknown> | undefined;
    const grants = cfg?.grants as unknown[] | undefined;
    if (Array.isArray(grants)) {
      for (const g of grants) {
        if (typeof g === "string" && g.startsWith(prefix)) {
          results.push(g.replace(prefix, ""));
        }
      }
    }
  }
  return results;
}

function extractSkillChoices(advancement: unknown[] | undefined): { count: number; pool: string[] } {
  if (!Array.isArray(advancement)) return { count: 0, pool: [] };
  for (const adv of advancement) {
    const a = adv as Record<string, unknown>;
    if (a?.type !== "Trait") continue;
    const cfg = a?.configuration as Record<string, unknown> | undefined;
    const choices = cfg?.choices as unknown[] | undefined;
    if (!Array.isArray(choices) || choices.length === 0) continue;
    const first = choices[0] as Record<string, unknown>;
    const pool = (first?.pool as unknown[] | undefined) ?? [];
    const skillPool = (pool as string[]).filter((p) => typeof p === "string" && p.startsWith("skills:"));
    if (skillPool.length > 0) {
      return { count: Number(first?.count ?? 0), pool: skillPool.map((s) => s.replace("skills:", "")) };
    }
  }
  return { count: 0, pool: [] };
}

function extractSubclassLevel(advancement: unknown[] | undefined): number | null {
  if (!Array.isArray(advancement)) return null;
  for (const adv of advancement) {
    const a = adv as Record<string, unknown>;
    if (a?.type === "Subclass") {
      return (a?.level as number | undefined) ?? null;
    }
  }
  return null;
}

function extractClassFeatures(advancement: unknown[] | undefined): string[] {
  if (!Array.isArray(advancement)) return [];
  const features: string[] = [];
  for (const adv of advancement) {
    const a = adv as Record<string, unknown>;
    if (a?.type === "ItemGrant") {
      const title = a?.title as string | undefined;
      if (title) features.push(title);
    }
  }
  return [...new Set(features)];
}

function map_class(raw: Record<string, unknown>): ClassRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const advancement = sys?.advancement as unknown[] | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const spellcasting = sys?.spellcasting as Record<string, unknown> | undefined;
  const primaryAbility = sys?.primaryAbility as Record<string, unknown> | undefined;
  const hd = sys?.hd as Record<string, unknown> | undefined;

  const savingThrows = extractClassTraits(advancement, "Trait", "saves:");
  const armorProfs = extractClassTraits(advancement, "Trait", "armor:");
  const weaponProfs = extractClassTraits(advancement, "Trait", "weapon:");
  const skillInfo = extractSkillChoices(advancement);

  const tags: string[] = [];
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;
  if (rulesEdition) tags.push(rulesEdition);

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    hit_die: (hd?.denomination as string | null | undefined) ?? null,
    primary_ability: JSON.stringify(
      Array.isArray(primaryAbility?.value) ? primaryAbility!.value : []
    ),
    saving_throws: JSON.stringify(savingThrows),
    skill_choices_count: skillInfo.count,
    skill_choices: JSON.stringify(skillInfo.pool),
    armor_proficiencies: JSON.stringify(armorProfs),
    weapon_proficiencies: JSON.stringify(weaponProfs),
    spellcasting:
      spellcasting?.progression && spellcasting.progression !== "none"
        ? (spellcasting.progression as string)
        : null,
    subclass_level: extractSubclassLevel(advancement),
    features: JSON.stringify(extractClassFeatures(advancement)),
  };
}

function upsert_class(db: Database.Database, row: ClassRow): void {
  db.prepare(`
    INSERT INTO classes (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      hit_die, primary_ability, saving_throws,
      skill_choices_count, skill_choices,
      armor_proficiencies, weapon_proficiencies,
      spellcasting, subclass_level, features, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @hit_die, @primary_ability, @saving_throws,
      @skill_choices_count, @skill_choices,
      @armor_proficiencies, @weapon_proficiencies,
      @spellcasting, @subclass_level, @features, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      hit_die = excluded.hit_die,
      primary_ability = excluded.primary_ability,
      saving_throws = excluded.saving_throws,
      skill_choices_count = excluded.skill_choices_count,
      skill_choices = excluded.skill_choices,
      armor_proficiencies = excluded.armor_proficiencies,
      weapon_proficiencies = excluded.weapon_proficiencies,
      spellcasting = excluded.spellcasting,
      subclass_level = excluded.subclass_level,
      features = excluded.features,
      updated_at = datetime('now');
  `).run(row);
}

function importClasses(): void {
  const db = openDb("classes.db");
  ensureSchema_classes(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "classes24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "class") continue;
      const row = map_class(raw);
      upsert_class(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:classes] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM classes").get() as { total: number };
  db.close();
  console.log(`[import:classes] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// SPELLS
// ===========================================================================

type SpellRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  level: number;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  components: string;
  material: string | null;
  duration: string | null;
  concentration: number;
  ritual: number;
  damage_type: string | null;
  damage_dice: string | null;
  higher_levels: string | null;
};

function ensureSchema_spells(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS spells (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      level INTEGER NOT NULL,
      school TEXT,
      casting_time TEXT,
      range TEXT,
      components TEXT,
      material TEXT,
      duration TEXT,
      concentration INTEGER DEFAULT 0,
      ritual INTEGER DEFAULT 0,
      damage_type TEXT,
      damage_dice TEXT,
      higher_levels TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS spells_fts USING fts5(
      id, name, tags, summary, body, school,
      content='spells', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS spells_ai AFTER INSERT ON spells BEGIN
      INSERT INTO spells_fts(rowid, id, name, tags, summary, body, school)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.school);
    END;

    CREATE TRIGGER IF NOT EXISTS spells_ad AFTER DELETE ON spells BEGIN
      INSERT INTO spells_fts(spells_fts, rowid, id, name, tags, summary, body, school)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.school);
    END;

    CREATE TRIGGER IF NOT EXISTS spells_au AFTER UPDATE ON spells BEGIN
      INSERT INTO spells_fts(spells_fts, rowid, id, name, tags, summary, body, school)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.school);
      INSERT INTO spells_fts(rowid, id, name, tags, summary, body, school)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.school);
    END;
  `);
}

const SCHOOL_NAMES: Record<string, string> = {
  abj: "abjuration",
  con: "conjuration",
  div: "divination",
  enc: "enchantment",
  evo: "evocation",
  ill: "illusion",
  nec: "necromancy",
  trs: "transmutation",
};

function map_spell(raw: Record<string, unknown>): SpellRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const properties = (sys?.properties as string[] | undefined) ?? [];
  const activation = sys?.activation as Record<string, unknown> | undefined;
  const duration = sys?.duration as Record<string, unknown> | undefined;
  const range = sys?.range as Record<string, unknown> | undefined;
  const materials = sys?.materials as Record<string, unknown> | undefined;
  const activities = sys?.activities as Record<string, unknown> | undefined;
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;

  const { damage_type, damage_dice } = extractSpellDamage(activities);

  const schoolCode = sys?.school as string | undefined;
  const schoolName = schoolCode ? (SCHOOL_NAMES[schoolCode] ?? schoolCode) : null;

  const activationType = activation?.type as string | undefined;
  const activationValue = activation?.value as number | undefined;
  let castingTime: string | null = null;
  if (activationType) {
    castingTime = activationValue && activationValue > 1
      ? `${activationValue} ${activationType}s`
      : activationType;
  }

  const durationValue = duration?.value as string | number | undefined;
  const durationUnits = duration?.units as string | undefined;
  let durationStr: string | null = null;
  if (durationUnits === "inst") {
    durationStr = "instantaneous";
  } else if (durationUnits === "perm") {
    durationStr = "until dispelled";
  } else if (durationUnits && durationValue) {
    durationStr = `${durationValue} ${durationUnits}`;
  } else if (durationUnits) {
    durationStr = durationUnits;
  }

  const rangeValue = range?.value as string | number | undefined;
  const rangeUnits = range?.units as string | undefined;
  let rangeStr: string | null = null;
  if (rangeUnits === "self") {
    rangeStr = "self";
  } else if (rangeUnits === "touch") {
    rangeStr = "touch";
  } else if (rangeUnits === "spec") {
    rangeStr = "special";
  } else if (rangeValue && rangeUnits) {
    rangeStr = `${rangeValue} ${rangeUnits}`;
  }

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);
  if (schoolName) tags.push(schoolName);

  const level = typeof sys?.level === "number" ? sys.level : Number(sys?.level ?? 0);

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    level,
    school: schoolName,
    casting_time: castingTime,
    range: rangeStr,
    components: JSON.stringify(properties.filter((p) => ["vocal", "somatic", "material"].includes(p))),
    material: (materials?.value as string | null | undefined) ?? null,
    duration: durationStr,
    concentration: properties.includes("concentration") ? 1 : 0,
    ritual: properties.includes("ritual") ? 1 : 0,
    damage_type,
    damage_dice,
    higher_levels: null,
  };
}

function upsert_spell(db: Database.Database, row: SpellRow): void {
  db.prepare(`
    INSERT INTO spells (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      level, school, casting_time, range, components, material,
      duration, concentration, ritual, damage_type, damage_dice, higher_levels,
      updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @level, @school, @casting_time, @range, @components, @material,
      @duration, @concentration, @ritual, @damage_type, @damage_dice, @higher_levels,
      datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      level = excluded.level,
      school = excluded.school,
      casting_time = excluded.casting_time,
      range = excluded.range,
      components = excluded.components,
      material = excluded.material,
      duration = excluded.duration,
      concentration = excluded.concentration,
      ritual = excluded.ritual,
      damage_type = excluded.damage_type,
      damage_dice = excluded.damage_dice,
      higher_levels = excluded.higher_levels,
      updated_at = datetime('now');
  `).run(row);
}

function importSpells(): void {
  const db = openDb("spells.db");
  ensureSchema_spells(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "spells24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "spell") continue;
      const row = map_spell(raw);
      upsert_spell(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:spells] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM spells").get() as { total: number };
  db.close();
  console.log(`[import:spells] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// EQUIPMENT
// ===========================================================================

type EquipmentRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  equipment_type: string | null;
  weight: number | null;
  cost_value: number | null;
  cost_denomination: string | null;
  damage_dice: string | null;
  damage_type: string | null;
  properties: string;
  range_normal: number | null;
  range_long: number | null;
  ac_base: number | null;
  ac_dex_bonus: number;
  ac_max_bonus: number | null;
  strength_req: number | null;
  stealth_disadv: number;
};

function ensureSchema_equipment(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      equipment_type TEXT,
      weight REAL,
      cost_value REAL,
      cost_denomination TEXT,
      damage_dice TEXT,
      damage_type TEXT,
      properties TEXT,
      range_normal INTEGER,
      range_long INTEGER,
      ac_base INTEGER,
      ac_dex_bonus INTEGER DEFAULT 1,
      ac_max_bonus INTEGER,
      strength_req INTEGER,
      stealth_disadv INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS equipment_fts USING fts5(
      id, name, tags, summary, body, equipment_type,
      content='equipment', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS equipment_ai AFTER INSERT ON equipment BEGIN
      INSERT INTO equipment_fts(rowid, id, name, tags, summary, body, equipment_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.equipment_type);
    END;

    CREATE TRIGGER IF NOT EXISTS equipment_ad AFTER DELETE ON equipment BEGIN
      INSERT INTO equipment_fts(equipment_fts, rowid, id, name, tags, summary, body, equipment_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.equipment_type);
    END;

    CREATE TRIGGER IF NOT EXISTS equipment_au AFTER UPDATE ON equipment BEGIN
      INSERT INTO equipment_fts(equipment_fts, rowid, id, name, tags, summary, body, equipment_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.equipment_type);
      INSERT INTO equipment_fts(rowid, id, name, tags, summary, body, equipment_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.equipment_type);
    END;
  `);
}

function map_equipment(raw: Record<string, unknown>): EquipmentRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;
  const itemType = raw?.type as string | undefined;
  const typeObj = sys?.type as Record<string, unknown> | undefined;
  const typeValue = typeObj?.value as string | undefined;

  const weightObj = sys?.weight as Record<string, unknown> | undefined;
  const priceObj = sys?.price as Record<string, unknown> | undefined;
  const armorObj = sys?.armor as Record<string, unknown> | undefined;
  const damageObj = sys?.damage as Record<string, unknown> | undefined;
  const baseDamage = damageObj?.base as Record<string, unknown> | undefined;
  const rangeObj = sys?.range as Record<string, unknown> | undefined;
  const properties = (sys?.properties as string[] | undefined) ?? [];

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);
  if (typeValue) tags.push(typeValue);
  if (itemType) tags.push(itemType);

  // Determine equipment_type: prefer typeValue, fall back to item type
  const equipType = typeValue ?? itemType ?? null;

  // Damage dice from base damage
  let damage_dice: string | null = null;
  let damage_type: string | null = null;
  if (baseDamage) {
    const num = baseDamage.number as number | null | undefined;
    const den = Number(baseDamage.denomination ?? 0);
    if (num && den > 0) {
      damage_dice = `${num}d${den}`;
    }
    const types = baseDamage.types as string[] | undefined;
    if (Array.isArray(types) && types.length > 0) {
      damage_type = types[0];
    }
  }

  // AC fields
  const acBase = armorObj?.value as number | null | undefined;
  const acDex = armorObj?.dex as number | null | undefined;
  // dex: 0 = no dex bonus (heavy), null = unlimited, number = max
  // ac_dex_bonus: 1 = has dex bonus, 0 = no dex bonus
  const hasDexBonus = acDex !== 0 ? 1 : 0;
  const acMaxBonus = typeof acDex === "number" && acDex > 0 ? acDex : null;

  const stealthDisadv = properties.includes("stealthDisadvantage") ? 1 : 0;

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    equipment_type: equipType,
    weight: weightObj?.value != null ? Number(weightObj.value) : null,
    cost_value: priceObj?.value != null ? Number(priceObj.value) : null,
    cost_denomination: (priceObj?.denomination as string | null | undefined) ?? null,
    damage_dice,
    damage_type,
    properties: JSON.stringify(properties),
    range_normal: rangeObj?.value != null ? Number(rangeObj.value) : null,
    range_long: rangeObj?.long != null ? Number(rangeObj.long) : null,
    ac_base: acBase ?? null,
    ac_dex_bonus: hasDexBonus,
    ac_max_bonus: acMaxBonus,
    strength_req: sys?.strength != null ? Number(sys.strength) : null,
    stealth_disadv: stealthDisadv,
  };
}

function upsert_equipment(db: Database.Database, row: EquipmentRow): void {
  db.prepare(`
    INSERT INTO equipment (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      equipment_type, weight, cost_value, cost_denomination,
      damage_dice, damage_type, properties,
      range_normal, range_long,
      ac_base, ac_dex_bonus, ac_max_bonus,
      strength_req, stealth_disadv, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @equipment_type, @weight, @cost_value, @cost_denomination,
      @damage_dice, @damage_type, @properties,
      @range_normal, @range_long,
      @ac_base, @ac_dex_bonus, @ac_max_bonus,
      @strength_req, @stealth_disadv, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      equipment_type = excluded.equipment_type,
      weight = excluded.weight,
      cost_value = excluded.cost_value,
      cost_denomination = excluded.cost_denomination,
      damage_dice = excluded.damage_dice,
      damage_type = excluded.damage_type,
      properties = excluded.properties,
      range_normal = excluded.range_normal,
      range_long = excluded.range_long,
      ac_base = excluded.ac_base,
      ac_dex_bonus = excluded.ac_dex_bonus,
      ac_max_bonus = excluded.ac_max_bonus,
      strength_req = excluded.strength_req,
      stealth_disadv = excluded.stealth_disadv,
      updated_at = datetime('now');
  `).run(row);
}

function importEquipment(): void {
  const db = openDb("equipment.db");
  ensureSchema_equipment(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "equipment24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const t = raw?.type as string | undefined;
      if (t !== "weapon" && t !== "equipment") continue;
      const row = map_equipment(raw);
      upsert_equipment(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:equipment] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM equipment").get() as { total: number };
  db.close();
  console.log(`[import:equipment] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// FEATS
// ===========================================================================

type FeatRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  feat_type: string | null;
  prerequisite: string | null;
  repeatable: number;
};

function ensureSchema_feats(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feats (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      feat_type TEXT,
      prerequisite TEXT,
      repeatable INTEGER DEFAULT 0
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS feats_fts USING fts5(
      id, name, tags, summary, body, feat_type,
      content='feats', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS feats_ai AFTER INSERT ON feats BEGIN
      INSERT INTO feats_fts(rowid, id, name, tags, summary, body, feat_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.feat_type);
    END;

    CREATE TRIGGER IF NOT EXISTS feats_ad AFTER DELETE ON feats BEGIN
      INSERT INTO feats_fts(feats_fts, rowid, id, name, tags, summary, body, feat_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.feat_type);
    END;

    CREATE TRIGGER IF NOT EXISTS feats_au AFTER UPDATE ON feats BEGIN
      INSERT INTO feats_fts(feats_fts, rowid, id, name, tags, summary, body, feat_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.feat_type);
      INSERT INTO feats_fts(rowid, id, name, tags, summary, body, feat_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.feat_type);
    END;
  `);
}

function map_feat(raw: Record<string, unknown>): FeatRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;
  const typeObj = sys?.type as Record<string, unknown> | undefined;
  const prereqs = sys?.prerequisites as Record<string, unknown> | undefined;

  const featType = typeObj?.subtype as string | undefined ?? typeObj?.value as string | undefined ?? null;
  const requirements = sys?.requirements as string | null | undefined;
  const prereqLevel = prereqs?.level as number | null | undefined;

  // Build prerequisite string
  let prerequisite: string | null = null;
  const parts: string[] = [];
  if (prereqLevel) parts.push(`Level ${prereqLevel}`);
  if (requirements) parts.push(requirements);
  if (parts.length > 0) prerequisite = parts.join("; ");

  const repeatable = prereqs?.repeatable ? 1 : 0;

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);
  if (featType) tags.push(featType);

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    feat_type: featType,
    prerequisite,
    repeatable,
  };
}

function upsert_feat(db: Database.Database, row: FeatRow): void {
  db.prepare(`
    INSERT INTO feats (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      feat_type, prerequisite, repeatable, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @feat_type, @prerequisite, @repeatable, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      feat_type = excluded.feat_type,
      prerequisite = excluded.prerequisite,
      repeatable = excluded.repeatable,
      updated_at = datetime('now');
  `).run(row);
}

function importFeats(): void {
  const db = openDb("feats.db");
  ensureSchema_feats(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "feats24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "feat") continue;
      const row = map_feat(raw);
      upsert_feat(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:feats] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM feats").get() as { total: number };
  db.close();
  console.log(`[import:feats] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// BACKGROUNDS
// ===========================================================================

type BackgroundRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  skill_proficiencies: string;
  tool_proficiencies: string;
  languages: number;
  feat: string | null;
  starting_equipment: string;
};

function ensureSchema_backgrounds(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS backgrounds (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      skill_proficiencies TEXT,
      tool_proficiencies TEXT,
      languages INTEGER,
      feat TEXT,
      starting_equipment TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS backgrounds_fts USING fts5(
      id, name, tags, summary, body,
      content='backgrounds', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS backgrounds_ai AFTER INSERT ON backgrounds BEGIN
      INSERT INTO backgrounds_fts(rowid, id, name, tags, summary, body)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
    END;

    CREATE TRIGGER IF NOT EXISTS backgrounds_ad AFTER DELETE ON backgrounds BEGIN
      INSERT INTO backgrounds_fts(backgrounds_fts, rowid, id, name, tags, summary, body)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
    END;

    CREATE TRIGGER IF NOT EXISTS backgrounds_au AFTER UPDATE ON backgrounds BEGIN
      INSERT INTO backgrounds_fts(backgrounds_fts, rowid, id, name, tags, summary, body)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body);
      INSERT INTO backgrounds_fts(rowid, id, name, tags, summary, body)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body);
    END;
  `);
}

function extractBackgroundProficiencies(
  advancement: unknown[] | undefined
): { skills: string[]; tools: string[]; languages: number; feat: string | null } {
  if (!Array.isArray(advancement)) return { skills: [], tools: [], languages: 0, feat: null };

  const skills: string[] = [];
  const tools: string[] = [];
  let languages = 0;
  let feat: string | null = null;

  for (const adv of advancement) {
    const a = adv as Record<string, unknown>;
    const type = a?.type as string | undefined;
    const cfg = a?.configuration as Record<string, unknown> | undefined;

    if (type === "Trait") {
      const grants = (cfg?.grants as unknown[] | undefined) ?? [];
      for (const g of grants) {
        if (typeof g !== "string") continue;
        if (g.startsWith("skills:")) skills.push(g.replace("skills:", ""));
        else if (g.startsWith("tool:")) tools.push(g.replace("tool:", ""));
        else if (g.startsWith("languages:")) languages += 1;
      }
      // Count language choices
      const choices = (cfg?.choices as unknown[] | undefined) ?? [];
      for (const ch of choices) {
        const choice = ch as Record<string, unknown>;
        const pool = (choice?.pool as unknown[] | undefined) ?? [];
        const langChoices = (pool as string[]).filter(
          (p) => typeof p === "string" && p.startsWith("languages:")
        );
        if (langChoices.length > 0) {
          languages += Number(choice?.count ?? 0);
        }
      }
    }

    if (type === "ItemGrant") {
      const items = (cfg?.items as unknown[] | undefined) ?? [];
      if (items.length > 0) {
        const first = items[0] as Record<string, unknown>;
        const uuid = first?.uuid as string | undefined;
        if (uuid && uuid.includes("feats24")) {
          feat = uuid;
        }
      }
    }
  }

  return { skills, tools, languages, feat };
}

function map_background(raw: Record<string, unknown>): BackgroundRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.description as Record<string, unknown> | undefined)?.value as string ?? "";
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;
  const advancement = sys?.advancement as unknown[] | undefined;
  const startingEquipment = (sys?.startingEquipment as unknown[] | undefined) ?? [];

  const { skills, tools, languages, feat } = extractBackgroundProficiencies(advancement);

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);

  return {
    id: (sys?.identifier as string | undefined) ?? slugify(String(raw?.name ?? "unknown")),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    skill_proficiencies: JSON.stringify(skills),
    tool_proficiencies: JSON.stringify(tools),
    languages,
    feat,
    starting_equipment: JSON.stringify(
      startingEquipment
        .filter((e) => {
          const eq = e as Record<string, unknown>;
          return eq?.type === "linked" && eq?.key;
        })
        .map((e) => (e as Record<string, unknown>).key)
    ),
  };
}

function upsert_background(db: Database.Database, row: BackgroundRow): void {
  db.prepare(`
    INSERT INTO backgrounds (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      skill_proficiencies, tool_proficiencies, languages, feat, starting_equipment,
      updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @skill_proficiencies, @tool_proficiencies, @languages, @feat, @starting_equipment,
      datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      skill_proficiencies = excluded.skill_proficiencies,
      tool_proficiencies = excluded.tool_proficiencies,
      languages = excluded.languages,
      feat = excluded.feat,
      starting_equipment = excluded.starting_equipment,
      updated_at = datetime('now');
  `).run(row);
}

function importBackgrounds(): void {
  const db = openDb("backgrounds.db");
  ensureSchema_backgrounds(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "origins24", "backgrounds"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "background") continue;
      const row = map_background(raw);
      upsert_background(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:backgrounds] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM backgrounds").get() as { total: number };
  db.close();
  console.log(`[import:backgrounds] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// MONSTERS
// ===========================================================================

type MonsterRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  creature_type: string | null;
  size: string | null;
  alignment: string | null;
  armor_class: number | null;
  hit_points: string | null;
  speed_walk: number | null;
  speed_fly: number | null;
  speed_swim: number | null;
  speed_climb: number | null;
  speed_burrow: number | null;
  str: number | null;
  dex: number | null;
  con: number | null;
  int_score: number | null;
  wis: number | null;
  cha: number | null;
  challenge_rating: string | null;
  xp: number | null;
};

function ensureSchema_monsters(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS monsters (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      creature_type TEXT,
      size TEXT,
      alignment TEXT,
      armor_class INTEGER,
      hit_points TEXT,
      speed_walk INTEGER,
      speed_fly INTEGER,
      speed_swim INTEGER,
      speed_climb INTEGER,
      speed_burrow INTEGER,
      str INTEGER,
      dex INTEGER,
      con INTEGER,
      int_score INTEGER,
      wis INTEGER,
      cha INTEGER,
      challenge_rating TEXT,
      xp INTEGER
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS monsters_fts USING fts5(
      id, name, tags, summary, body, creature_type,
      content='monsters', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS monsters_ai AFTER INSERT ON monsters BEGIN
      INSERT INTO monsters_fts(rowid, id, name, tags, summary, body, creature_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.creature_type);
    END;

    CREATE TRIGGER IF NOT EXISTS monsters_ad AFTER DELETE ON monsters BEGIN
      INSERT INTO monsters_fts(monsters_fts, rowid, id, name, tags, summary, body, creature_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.creature_type);
    END;

    CREATE TRIGGER IF NOT EXISTS monsters_au AFTER UPDATE ON monsters BEGIN
      INSERT INTO monsters_fts(monsters_fts, rowid, id, name, tags, summary, body, creature_type)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.creature_type);
      INSERT INTO monsters_fts(rowid, id, name, tags, summary, body, creature_type)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.creature_type);
    END;
  `);
}

const SIZE_MAP: Record<string, string> = {
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan",
};

function map_monster(raw: Record<string, unknown>): MonsterRow {
  const sys = raw?.system as Record<string, unknown> | undefined;
  const body = (sys?.details as Record<string, unknown> | undefined)?.biography
    ? ((sys!.details as Record<string, unknown>).biography as Record<string, unknown>).value as string ?? ""
    : "";
  const rulesEdition = (sys?.source as Record<string, unknown> | undefined)?.rules as string | undefined;

  const abilities = sys?.abilities as Record<string, Record<string, unknown>> | undefined;
  const attributes = sys?.attributes as Record<string, unknown> | undefined;
  const details = sys?.details as Record<string, unknown> | undefined;
  const traits = sys?.traits as Record<string, unknown> | undefined;
  const movement = attributes?.movement as Record<string, unknown> | undefined;
  const senses = (attributes?.senses as Record<string, unknown> | undefined);
  const hp = attributes?.hp as Record<string, unknown> | undefined;
  const ac = attributes?.ac as Record<string, unknown> | undefined;
  const typeObj = details?.type as Record<string, unknown> | undefined;
  const cr = details?.cr;
  const crStr = formatCR(cr as number | string | null | undefined);
  const xp = crToXp(cr as number | string | null | undefined);

  const sizeCode = (traits?.size as string | undefined) ?? null;
  const sizeLabel = sizeCode ? (SIZE_MAP[sizeCode] ?? sizeCode) : null;
  const creatureType = typeObj?.value as string | null ?? null;

  const tags: string[] = [];
  if (rulesEdition) tags.push(rulesEdition);
  if (creatureType) tags.push(creatureType);
  if (sizeLabel) tags.push(sizeLabel);

  // HP: prefer formula if available, otherwise use max value
  const hpFormula = hp?.formula as string | null | undefined;
  const hpMax = hp?.max as number | null | undefined;
  let hitPoints: string | null = null;
  if (hpFormula) {
    hitPoints = hpMax != null ? `${hpMax} (${hpFormula})` : hpFormula;
  } else if (hpMax != null) {
    hitPoints = String(hpMax);
  }

  // Speed: values are strings in actors24, coerce to number
  const walkStr = movement?.walk;
  const flyStr = movement?.fly;
  const swimStr = movement?.swim;
  const climbStr = movement?.climb;
  const burrowStr = movement?.burrow;

  // AC: use flat value, or items[0].flat from computed AC
  const acFlat = ac?.flat as number | null | undefined;

  // Senses are under attributes.senses.ranges in actors24
  const sensesRanges = (senses as Record<string, unknown> | undefined)?.ranges as Record<string, unknown> | undefined;

  return {
    id: slugify(String(raw?.name ?? "unknown")) + "-" + String(raw?._id ?? "").slice(0, 8),
    foundry_id: (raw?._id as string | null | undefined) ?? null,
    name: String(raw?.name ?? "Unknown"),
    origin: "dnd",
    source: rulesEdition === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: ((sys?.source as Record<string, unknown> | undefined)?.license as string | null | undefined) ?? null,
    rules_edition: rulesEdition ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: (raw?.img as string | null | undefined) ?? null,
    creature_type: creatureType,
    size: sizeLabel,
    alignment: (details?.alignment as string | null | undefined) ?? null,
    armor_class: acFlat ?? null,
    hit_points: hitPoints,
    speed_walk: walkStr != null ? Number(walkStr) || null : null,
    speed_fly: flyStr != null ? Number(flyStr) || null : null,
    speed_swim: swimStr != null ? Number(swimStr) || null : null,
    speed_climb: climbStr != null ? Number(climbStr) || null : null,
    speed_burrow: burrowStr != null ? Number(burrowStr) || null : null,
    str: abilities?.str?.value != null ? Number(abilities.str.value) : null,
    dex: abilities?.dex?.value != null ? Number(abilities.dex.value) : null,
    con: abilities?.con?.value != null ? Number(abilities.con.value) : null,
    int_score: abilities?.int?.value != null ? Number(abilities.int.value) : null,
    wis: abilities?.wis?.value != null ? Number(abilities.wis.value) : null,
    cha: abilities?.cha?.value != null ? Number(abilities.cha.value) : null,
    challenge_rating: crStr,
    xp: xp > 0 ? xp : null,
  };
}

function upsert_monster(db: Database.Database, row: MonsterRow): void {
  db.prepare(`
    INSERT INTO monsters (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      creature_type, size, alignment,
      armor_class, hit_points,
      speed_walk, speed_fly, speed_swim, speed_climb, speed_burrow,
      str, dex, con, int_score, wis, cha,
      challenge_rating, xp, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @creature_type, @size, @alignment,
      @armor_class, @hit_points,
      @speed_walk, @speed_fly, @speed_swim, @speed_climb, @speed_burrow,
      @str, @dex, @con, @int_score, @wis, @cha,
      @challenge_rating, @xp, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      creature_type = excluded.creature_type,
      size = excluded.size,
      alignment = excluded.alignment,
      armor_class = excluded.armor_class,
      hit_points = excluded.hit_points,
      speed_walk = excluded.speed_walk,
      speed_fly = excluded.speed_fly,
      speed_swim = excluded.speed_swim,
      speed_climb = excluded.speed_climb,
      speed_burrow = excluded.speed_burrow,
      str = excluded.str,
      dex = excluded.dex,
      con = excluded.con,
      int_score = excluded.int_score,
      wis = excluded.wis,
      cha = excluded.cha,
      challenge_rating = excluded.challenge_rating,
      xp = excluded.xp,
      updated_at = datetime('now');
  `).run(row);
}

function importMonsters(): void {
  const db = openDb("monsters.db");
  ensureSchema_monsters(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "actors24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      if (raw?.type !== "npc") continue;
      const row = map_monster(raw);
      upsert_monster(db, row);
      imported += 1;
    } catch (err) {
      console.error(`[import:monsters] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM monsters").get() as { total: number };
  db.close();
  console.log(`[import:monsters] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// RULES (from content24 JournalEntry pages)
// ===========================================================================

type RuleRow = {
  id: string;
  foundry_id: string | null;
  name: string;
  origin: "dnd";
  source: string;
  license: string | null;
  rules_edition: string | null;
  tags: string;
  summary: string;
  body: string;
  body_format: "html";
  image: string | null;
  rule_category: string | null;
  parent_rule: string | null;
};

function ensureSchema_rules(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      foundry_id TEXT,
      name TEXT NOT NULL,
      origin TEXT NOT NULL DEFAULT 'dnd',
      source TEXT,
      license TEXT,
      rules_edition TEXT,
      tags TEXT,
      summary TEXT,
      body TEXT,
      body_format TEXT DEFAULT 'html',
      image TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      rule_category TEXT,
      parent_rule TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS rules_fts USING fts5(
      id, name, tags, summary, body, rule_category,
      content='rules', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS rules_ai AFTER INSERT ON rules BEGIN
      INSERT INTO rules_fts(rowid, id, name, tags, summary, body, rule_category)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.rule_category);
    END;

    CREATE TRIGGER IF NOT EXISTS rules_ad AFTER DELETE ON rules BEGIN
      INSERT INTO rules_fts(rules_fts, rowid, id, name, tags, summary, body, rule_category)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.rule_category);
    END;

    CREATE TRIGGER IF NOT EXISTS rules_au AFTER UPDATE ON rules BEGIN
      INSERT INTO rules_fts(rules_fts, rowid, id, name, tags, summary, body, rule_category)
      VALUES ('delete', old.rowid, old.id, old.name, old.tags, old.summary, old.body, old.rule_category);
      INSERT INTO rules_fts(rowid, id, name, tags, summary, body, rule_category)
      VALUES (new.rowid, new.id, new.name, new.tags, new.summary, new.body, new.rule_category);
    END;
  `);
}

function deriveRuleCategory(filePath: string): string | null {
  // Extract category from directory structure: content24/<category>/...
  const rel = filePath.replace(/\\/g, "/");
  const match = rel.match(/content24\/([^/]+)\//);
  if (!match) return null;
  // Map directory names to readable categories
  const catMap: Record<string, string> = {
    "chapter-1": "Playing the Game",
    "chapter-2": "Creating a Character",
    "chapter-3": "Equipment",
    "chapter-4": "Spells",
    "chapter-5": "Game Mastering",
    "chapter-6": "The Environment",
    "chapter-7": "Monsters",
    "appendices": "Appendix",
    "dms-toolbox": "DM Toolbox",
    "magic-items": "Magic Items",
    "monsters": "Monsters",
  };
  return catMap[match[1]] ?? match[1];
}

function map_rules(
  journal: Record<string, unknown>,
  filePath: string
): RuleRow[] {
  const pages = journal?.pages as unknown[] | undefined;
  if (!Array.isArray(pages)) return [];

  const journalId = journal?._id as string | undefined;
  const journalName = journal?.name as string | undefined;
  const category = deriveRuleCategory(filePath);
  const rows: RuleRow[] = [];

  for (const page of pages) {
    const p = page as Record<string, unknown>;
    if (!p) continue;

    // Only import text/rule pages that have content
    const pageType = p?.type as string | undefined;
    if (pageType !== "text" && pageType !== "rule") continue;

    const textObj = p?.text as Record<string, unknown> | undefined;
    const body = (textObj?.content as string | undefined) ?? "";
    if (!body.trim()) continue;

    const pageId = p?._id as string | undefined;
    const pageName = p?.name as string | undefined ?? journalName ?? "Unknown";

    // Build ID: slugify(journalName) + "-" + pageId
    const baseSlug = slugify(journalName ?? "rule");
    const id = pageId ? `${baseSlug}-${pageId}` : `${baseSlug}-${slugify(pageName)}`;

    const tags: string[] = ["2024"];
    if (category) tags.push(category);

    rows.push({
      id,
      foundry_id: pageId ?? null,
      name: pageName,
      origin: "dnd",
      source: "SRD 5.2",
      license: "CC-BY-4.0",
      rules_edition: "2024",
      tags: JSON.stringify(tags),
      summary: makeSummary(body),
      body,
      body_format: "html",
      image: null,
      rule_category: category,
      parent_rule: journalId ?? null,
    });
  }

  return rows;
}

function upsert_rule(db: Database.Database, row: RuleRow): void {
  db.prepare(`
    INSERT INTO rules (
      id, foundry_id, name, origin, source, license, rules_edition,
      tags, summary, body, body_format, image,
      rule_category, parent_rule, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition,
      @tags, @summary, @body, @body_format, @image,
      @rule_category, @parent_rule, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      foundry_id = excluded.foundry_id,
      name = excluded.name,
      origin = excluded.origin,
      source = excluded.source,
      license = excluded.license,
      rules_edition = excluded.rules_edition,
      tags = excluded.tags,
      summary = excluded.summary,
      body = excluded.body,
      body_format = excluded.body_format,
      image = excluded.image,
      rule_category = excluded.rule_category,
      parent_rule = excluded.parent_rule,
      updated_at = datetime('now');
  `).run(row);
}

function importRules(): void {
  const db = openDb("rules.db");
  ensureSchema_rules(db);
  const files = listYmlFilesRecursive(path.join(FOUNDRY_SRC, "content24"));
  let imported = 0;
  for (const file of files) {
    try {
      const raw = yaml.load(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      // JournalEntry files have `pages` array and no `type` field at root level
      if (!raw?.pages || raw?.type) continue;
      const rows = map_rules(raw, file);
      for (const row of rows) {
        upsert_rule(db, row);
        imported += 1;
      }
    } catch (err) {
      console.error(`[import:rules] ERROR in ${file}: ${(err as Error).message}`);
    }
  }
  const count = db.prepare("SELECT COUNT(*) as total FROM rules").get() as { total: number };
  db.close();
  console.log(`[import:rules] ${imported} imported, ${count.total} rows in DB`);
}

// ===========================================================================
// MAIN
// ===========================================================================

function main(): void {
  console.log("[import] Starting Foundry DnD 5e 2024 import");
  console.log(`[import] Source: ${FOUNDRY_SRC}`);
  console.log(`[import] DB root: ${DB_ROOT}`);
  console.log("");

  importSpecies();
  importTraits();
  importClasses();
  importSpells();
  importEquipment();
  importFeats();
  importBackgrounds();
  importMonsters();
  importRules();

  console.log("");
  console.log("[import] All collections imported successfully");
}

main();
