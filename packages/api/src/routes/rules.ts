import { Router } from "express";
import { getCollectionRow, isCollectionName, listCollection } from "../services/content";

export const rulesRouter = Router();

rulesRouter.get("/:collection", (req, res, next) => {
  const { collection } = req.params;
  if (!isCollectionName(collection)) {
    return next();
  }

  try {
    const result = listCollection(collection, req.query);
    res.json({
      collection,
      total: result.total,
      ...result.filters,
      items: result.items,
    });
  } catch (error) {
    res.status(400).json({
      message: (error as Error).message,
      collection,
    });
  }
});

rulesRouter.get("/:collection/:id", (req, res, next) => {
  const { collection, id } = req.params;
  if (!isCollectionName(collection)) {
    return next();
  }

  const item = getCollectionRow(collection, id);
  if (!item) {
    res.status(404).json({ message: "Registro no encontrado", collection, id });
    return;
  }

  res.json({
    collection,
    item,
  });
});
