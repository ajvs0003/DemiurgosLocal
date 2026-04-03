import Database from "better-sqlite3";
import { COLLECTIONS, type CollectionName, openDb } from "./database";

type ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

type SqlParams = Record<string, unknown>;
type QueryValue = string | string[] | undefined;
type QueryParams = Record<string, QueryValue | unknown>;

const columnCache = new Map<CollectionName, ColumnInfo[]>();
const RESERVED_LIST_PARAMS = new Set(["limit", "offset"]);
const RESERVED_ADMIN_FIELDS = new Set(["created_at", "foundry_id"]);

export type ListResult = {
  total: number;
  filters: Record<string, unknown>;
  items: Record<string, unknown>[];
};

function getColumns(collection: CollectionName): ColumnInfo[] {
  const cached = columnCache.get(collection);
  if (cached) return cached;

  const db = openDb(collection);
  const columns = db.prepare(`PRAGMA table_info(${collection})`).all() as ColumnInfo[];
  columnCache.set(collection, columns);
  return columns;
}

function getColumnMap(collection: CollectionName): Map<string, ColumnInfo> {
  return new Map(getColumns(collection).map((column) => [column.name, column]));
}

function parseJsonValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("[") || trimmed.startsWith("{"))) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === "string" ? parseJsonValue(value) : value;
  }

  return normalized;
}

function getSingleQueryValue(value: QueryValue | unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function normalizeFilterValue(column: ColumnInfo, rawValue: string): string | number {
  if (column.type.includes("INT")) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Filtro invalido para ${column.name}`);
    }
    return parsed;
  }

  if (column.type.includes("REAL")) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Filtro invalido para ${column.name}`);
    }
    return parsed;
  }

  return rawValue;
}

function parseLimit(value: string | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Parametro limit invalido");
  }
  return Math.min(parsed, max);
}

function parseOffset(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Parametro offset invalido");
  }
  return parsed;
}

export function isCollectionName(value: string): value is CollectionName {
  return COLLECTIONS.includes(value as CollectionName);
}

export function getCollectionRow(
  collection: CollectionName,
  id: string
): Record<string, unknown> | undefined {
  const db = openDb(collection);
  const row = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;

  return row ? normalizeRow(row) : undefined;
}

export function listCollection(collection: CollectionName, query: QueryParams): ListResult {
  const db = openDb(collection);
  const columnMap = getColumnMap(collection);
  const filters: Record<string, unknown> = {};
  const whereClauses: string[] = [];
  const params: SqlParams = {};

  for (const [key, rawValue] of Object.entries(query)) {
    if (RESERVED_LIST_PARAMS.has(key)) continue;
    if (!columnMap.has(key)) continue;

    const value = getSingleQueryValue(rawValue);
    if (value === undefined || value === "") continue;

    const column = columnMap.get(key)!;
    const normalizedValue = normalizeFilterValue(column, value);
    const paramName = `filter_${key}`;

    whereClauses.push(`${key} = @${paramName}`);
    params[paramName] = normalizedValue;
    filters[key] = normalizedValue;
  }

  const limit = parseLimit(getSingleQueryValue(query.limit), 50, 200);
  const offset = parseOffset(getSingleQueryValue(query.offset));
  params.limit = limit;
  params.offset = offset;

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM ${collection} ${whereSql}`).get(params) as {
    total: number;
  };
  const items = db.prepare(
    `SELECT * FROM ${collection} ${whereSql} ORDER BY name COLLATE NOCASE ASC LIMIT @limit OFFSET @offset`
  ).all(params) as Record<string, unknown>[];

  return {
    total: countRow.total,
    filters: { ...filters, limit, offset },
    items: items.map(normalizeRow),
  };
}

function normalizeValueForColumn(column: ColumnInfo, value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  if (column.type.includes("INT")) {
    if (typeof value === "boolean") return value ? 1 : 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Valor invalido para ${column.name}`);
    }
    return Math.trunc(parsed);
  }

  if (column.type.includes("REAL")) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Valor invalido para ${column.name}`);
    }
    return parsed;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function pickWritablePayload(
  collection: CollectionName,
  payload: Record<string, unknown>,
  options: { allowId: boolean }
): Record<string, unknown> {
  const columnMap = getColumnMap(collection);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (!columnMap.has(key)) continue;
    if (RESERVED_ADMIN_FIELDS.has(key)) continue;
    if (!options.allowId && key === "id") continue;

    const column = columnMap.get(key)!;
    const normalized = normalizeValueForColumn(column, value);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }

  return result;
}

function ensureRequiredColumns(collection: CollectionName, payload: Record<string, unknown>): void {
  const requiredColumns = getColumns(collection).filter(
    (column) => column.notnull === 1 && column.dflt_value === null && column.pk === 0
  );

  for (const column of requiredColumns) {
    if (payload[column.name] === undefined || payload[column.name] === null || payload[column.name] === "") {
      throw new Error(`Falta el campo requerido ${column.name}`);
    }
  }
}

export function buildAdminPayload(
  collection: CollectionName,
  payload: Record<string, unknown>,
  options: { allowId: boolean }
): Record<string, unknown> {
  return pickWritablePayload(collection, payload, options);
}

export function insertCollectionRow(
  collection: CollectionName,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const db = openDb(collection);
  const writablePayload = pickWritablePayload(collection, payload, { allowId: true });

  if (!writablePayload.id) {
    throw new Error("Falta el campo requerido id");
  }

  ensureRequiredColumns(collection, writablePayload);

  const columns = Object.keys(writablePayload);
  const sql = `INSERT INTO ${collection} (${columns.join(", ")}) VALUES (${columns
    .map((column) => `@${column}`)
    .join(", ")})`;

  db.prepare(sql).run(writablePayload);
  return getCollectionRow(collection, String(writablePayload.id))!;
}

export function updateCollectionRow(
  collection: CollectionName,
  id: string,
  payload: Record<string, unknown>
): Record<string, unknown> {
  const db = openDb(collection);
  const writablePayload = pickWritablePayload(collection, payload, { allowId: false });
  const columns = Object.keys(writablePayload);

  if (columns.length === 0) {
    throw new Error("No hay campos validos para actualizar");
  }

  const params: SqlParams = { ...writablePayload, id };
  const setClauses = columns.map((column) => `${column} = @${column}`);
  setClauses.push("updated_at = datetime('now')");

  const result = db
    .prepare(`UPDATE ${collection} SET ${setClauses.join(", ")} WHERE id = @id`)
    .run(params);

  if (result.changes === 0) {
    throw new Error("No se pudo actualizar el registro");
  }

  return getCollectionRow(collection, id)!;
}

export function deleteCollectionRow(collection: CollectionName, id: string): boolean {
  const db = openDb(collection);
  const result = db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
  return result.changes > 0;
}

function buildFtsQuery(input: string): string {
  const tokens = input
    .normalize("NFKD")
    .replace(/["']/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, "").trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error("Consulta vacia");
  }

  return tokens.map((token) => `${token}*`).join(" AND ");
}

type SearchRow = {
  id: string;
  name: string;
  summary: string | null;
  origin: string;
  collection: CollectionName;
  rank: number;
};

export function searchAllCollections(query: string, origin?: string, limit = 20): SearchRow[] {
  const ftsQuery = buildFtsQuery(query);
  const perCollectionLimit = Math.max(5, Math.min(limit, 50));
  const results: SearchRow[] = [];

  for (const collection of COLLECTIONS) {
    const db = openDb(collection);
    const ftsTable = `${collection}_fts`;
    const sql = `
      SELECT t.id, t.name, t.summary, t.origin, @collection as collection, bm25(${ftsTable}) as rank
      FROM ${ftsTable}
      JOIN ${collection} t ON t.rowid = ${ftsTable}.rowid
      WHERE ${ftsTable} MATCH @query
        AND (@origin IS NULL OR t.origin = @origin)
      ORDER BY rank ASC
      LIMIT @limit
    `;

    const rows = db.prepare(sql).all({
      collection,
      query: ftsQuery,
      origin: origin ?? null,
      limit: perCollectionLimit,
    }) as SearchRow[];

    results.push(...rows);
  }

  return results
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((row) => ({
      ...row,
      summary: row.summary ?? "",
    }));
}

export function getDbHandle(collection: CollectionName): Database.Database {
  return openDb(collection);
}
