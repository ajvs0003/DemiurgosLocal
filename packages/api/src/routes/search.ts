import { Router } from "express";
import { searchAllCollections } from "../services/content";

export const searchRouter = Router();

searchRouter.get("/search", (req, res) => {
  const rawQuery = typeof req.query.q === "string" ? req.query.q : "";
  const origin = typeof req.query.origin === "string" ? req.query.origin : undefined;
  const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;

  if (!rawQuery.trim()) {
    res.status(400).json({ message: "El parametro q es obligatorio" });
    return;
  }

  try {
    const results = searchAllCollections(rawQuery, origin, Number.isFinite(limit) ? Math.min(limit, 50) : 20);
    res.json({
      query: rawQuery,
      origin,
      total: results.length,
      results,
    });
  } catch (error) {
    res.status(400).json({
      message: (error as Error).message,
      query: rawQuery,
    });
  }

});
