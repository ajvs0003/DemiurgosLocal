import fs from "fs";
import path from "path";
import { Router } from "express";
import matter from "gray-matter";
import multer from "multer";
import {
  buildAdminPayload,
  deleteCollectionRow,
  getCollectionRow,
  insertCollectionRow,
  isCollectionName,
  updateCollectionRow,
} from "../services/content";
import type { CollectionName } from "../services/database";
import { getImagesRoot } from "../services/paths";

export const adminRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-");
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
    .replace(/[>#*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSummary(markdown: string): string {
  return stripMarkdown(markdown).slice(0, 220).trim();
}

function normalizeTags(tags: unknown): unknown {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return tags;
}

function extractMarkdown(req: { body: unknown; file?: Express.Multer.File }): string {
  if (req.file) {
    return req.file.buffer.toString("utf8");
  }

  if (typeof req.body === "string") {
    return req.body;
  }

  if (req.body && typeof req.body === "object") {
    const markdown = (req.body as Record<string, unknown>).markdown;
    const content = (req.body as Record<string, unknown>).content;
    if (typeof markdown === "string") return markdown;
    if (typeof content === "string") return content;
  }

  return "";
}

function buildImportedEntry(
  collection: CollectionName,
  markdown: string,
  originalName?: string,
  extraInput?: Record<string, unknown>
): Record<string, unknown> {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;
  const fileBaseName = originalName ? path.parse(originalName).name : undefined;
  const name =
    (typeof data.name === "string" && data.name) ||
    (typeof data.title === "string" && data.title) ||
    fileBaseName ||
    "Untitled";
  const id = (typeof data.id === "string" && data.id) || slugify(name);
  const body = parsed.content.trim();

  return buildAdminPayload(collection, {
    ...extraInput,
    ...data,
    id,
    name,
    origin: "nae",
    source: typeof data.source === "string" ? data.source : "Nae",
    license: typeof data.license === "string" ? data.license : "custom",
    rules_edition: typeof data.rules_edition === "string" ? data.rules_edition : "homebrew",
    body,
    body_format: "markdown",
    summary: typeof data.summary === "string" ? data.summary : makeSummary(body),
    tags: normalizeTags(data.tags),
  }, { allowId: true });
}

adminRouter.post("/import-md", upload.single("file"), (req, res) => {
  const body = req.body as Record<string, unknown>;
  const collection =
    (typeof body.collection === "string" && body.collection) ||
    (typeof body.targetCollection === "string" && body.targetCollection);

  if (!collection || !isCollectionName(collection)) {
    res.status(400).json({ message: "Collection invalida o ausente" });
    return;
  }

  const markdown = extractMarkdown(req);
  if (!markdown.trim()) {
    res.status(400).json({ message: "No se ha recibido contenido markdown" });
    return;
  }

  try {
    const payload = buildImportedEntry(collection, markdown, req.file?.originalname, body);
    const existing = getCollectionRow(collection, String(payload.id));

    if (existing && existing.origin !== "nae") {
      res.status(409).json({ message: "No se puede sobrescribir contenido oficial DnD", id: payload.id });
      return;
    }

    const item = existing
      ? updateCollectionRow(collection, String(payload.id), payload)
      : insertCollectionRow(collection, payload);

    res.status(existing ? 200 : 201).json({
      collection,
      action: existing ? "updated" : "created",
      item,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message, collection });
  }
});

adminRouter.post("/upload-image", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No se ha recibido ningun archivo" });
    return;
  }

  const originalName = path.basename(req.file.originalname);
  const extension = path.extname(originalName) || ".bin";
  const baseName = path.basename(originalName, extension);
  const safeName = `${Date.now()}-${slugify(baseName) || "image"}${extension.toLowerCase()}`;
  const absolutePath = path.join(getImagesRoot(), safeName);
  const publicPath = `/assets/images/${safeName}`;

  fs.writeFileSync(absolutePath, req.file.buffer);

  res.status(201).json({
    filename: safeName,
    path: publicPath,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

adminRouter.put("/:collection/:id", (req, res) => {
  const { collection, id } = req.params;

  if (!isCollectionName(collection)) {
    res.status(404).json({ message: "Collection no soportada" });
    return;
  }

  const existing = getCollectionRow(collection, id);
  if (!existing) {
    res.status(404).json({ message: "Registro no encontrado", collection, id });
    return;
  }

  if (existing.origin !== "nae") {
    res.status(403).json({ message: "Solo se puede editar contenido Nae", collection, id });
    return;
  }

  try {
    const payload = buildAdminPayload(collection, req.body as Record<string, unknown>, { allowId: false });
    if (payload.body !== undefined && payload.summary === undefined && typeof payload.body === "string") {
      payload.summary = makeSummary(payload.body);
    }
    const item = updateCollectionRow(collection, id, payload);

    res.json({
      collection,
      item,
    });
  } catch (error) {
    res.status(400).json({ message: (error as Error).message, collection, id });
  }
});

adminRouter.delete("/:collection/:id", (req, res) => {
  const { collection, id } = req.params;

  if (!isCollectionName(collection)) {
    res.status(404).json({ message: "Collection no soportada" });
    return;
  }

  const existing = getCollectionRow(collection, id);
  if (!existing) {
    res.status(404).json({ message: "Registro no encontrado", collection, id });
    return;
  }

  if (existing.origin !== "nae") {
    res.status(403).json({ message: "Solo se puede eliminar contenido Nae", collection, id });
    return;
  }

  deleteCollectionRow(collection, id);
  res.status(204).send();
});
