import Database from "better-sqlite3";
import path from "path";

export const COLLECTIONS = [
  "species",
  "classes",
  "spells",
  "equipment",
  "feats",
  "backgrounds",
  "monsters",
  "rules",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

const dbCache = new Map<CollectionName, Database.Database>();

export function getDbPath(collection: CollectionName) {
  return path.resolve(__dirname, `../../db/${collection}.db`);
}

export function openDb(collection: CollectionName) {
  const existing = dbCache.get(collection);
  if (existing) return existing;

  const db = new Database(getDbPath(collection));
  db.pragma("journal_mode = WAL");
  dbCache.set(collection, db);
  return db;
}

export function closeAllDbs() {
  for (const db of dbCache.values()) db.close();
  dbCache.clear();
}
