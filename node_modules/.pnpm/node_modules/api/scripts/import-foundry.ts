import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import Database from "better-sqlite3";

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

const ROOT = path.resolve(__dirname, "../../..");
const FOUNDRY_SPECIES_DIR = path.join(ROOT, "external", "foundry-dnd5e", "packs", "_source", "origins24", "species");
const DB_PATH = path.join(ROOT, "packages", "api", "db", "species.db");

function ensureSpeciesSchema(db: Database.Database) {
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

function listSpeciesFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) continue;
    if (!entry.name.endsWith(".yml")) continue;
    if (entry.name === "_folder.yml") continue;
    files.push(fullPath);
  }

  return files;
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSummary(html: string) {
  const text = stripHtml(html);
  return text.slice(0, 220).trim();
}

function extractTraits(advancement: any[] | undefined): string[] {
  if (!Array.isArray(advancement)) return [];
  return advancement
    .map((item) => item?.title)
    .filter((value): value is string => Boolean(value && String(value).trim()));
}

function extractSize(advancement: any[] | undefined): string[] {
  if (!Array.isArray(advancement)) return [];
  const sizeNode = advancement.find((item) => item?.type === "Size");
  return Array.isArray(sizeNode?.configuration?.sizes) ? sizeNode.configuration.sizes : [];
}

function mapSpecies(raw: any): SpeciesRow {
  const body = raw?.system?.description?.value ?? "";
  const tags = [
    raw?.system?.type?.value,
    raw?.system?.source?.rules === "2024" ? "2024" : null,
    ...extractTraits(raw?.system?.advancement),
  ].filter(Boolean);

  return {
    id: raw?.system?.identifier ?? raw?.name?.toLowerCase?.().replace(/\s+/g, "-") ?? "unknown",
    foundry_id: raw?._id ?? null,
    name: raw?.name ?? "Unknown",
    origin: "dnd",
    source: raw?.system?.source?.rules === "2024" ? "SRD 5.2" : "SRD 5.1",
    license: raw?.system?.source?.license ?? null,
    rules_edition: raw?.system?.source?.rules ?? null,
    tags: JSON.stringify(tags),
    summary: makeSummary(body),
    body,
    body_format: "html",
    image: raw?.img ?? null,
    creature_type: raw?.system?.type?.value ?? null,
    size: JSON.stringify(extractSize(raw?.system?.advancement)),
    speed_walk: raw?.system?.movement?.walk ?? null,
    speed_fly: raw?.system?.movement?.fly ?? null,
    speed_swim: raw?.system?.movement?.swim ?? null,
    speed_climb: raw?.system?.movement?.climb ?? null,
    speed_burrow: raw?.system?.movement?.burrow ?? null,
    darkvision: raw?.system?.senses?.darkvision ?? null,
    blindsight: raw?.system?.senses?.blindsight ?? null,
    tremorsense: raw?.system?.senses?.tremorsense ?? null,
    truesight: raw?.system?.senses?.truesight ?? null,
    traits: JSON.stringify(extractTraits(raw?.system?.advancement)),
  };
}

function upsertSpecies(db: Database.Database, row: SpeciesRow) {
  const stmt = db.prepare(`
    INSERT INTO species (
      id, foundry_id, name, origin, source, license, rules_edition, tags, summary, body, body_format, image,
      creature_type, size, speed_walk, speed_fly, speed_swim, speed_climb, speed_burrow,
      darkvision, blindsight, tremorsense, truesight, traits, updated_at
    ) VALUES (
      @id, @foundry_id, @name, @origin, @source, @license, @rules_edition, @tags, @summary, @body, @body_format, @image,
      @creature_type, @size, @speed_walk, @speed_fly, @speed_swim, @speed_climb, @speed_burrow,
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
  `);

  stmt.run(row);
}

function main() {
  console.log("[import] Starting species import from Foundry");
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  ensureSpeciesSchema(db);

  const files = listSpeciesFiles(FOUNDRY_SPECIES_DIR);
  let imported = 0;

  for (const file of files) {
    const raw = yaml.load(fs.readFileSync(file, "utf8"));
    const row = mapSpecies(raw);
    upsertSpecies(db, row);
    imported += 1;
  }

  const count = db.prepare("SELECT COUNT(*) as total FROM species").get() as { total: number };
  db.close();

  console.log(`[import] Species files processed: ${imported}`);
  console.log(`[import] Species rows in DB: ${count.total}`);
  console.log(`[import] DB updated: ${DB_PATH}`);
}

main();
