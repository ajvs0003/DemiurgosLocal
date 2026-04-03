import { Router } from "express";

export const rulesRouter = Router();

const collections = [
  "species",
  "classes",
  "spells",
  "equipment",
  "feats",
  "backgrounds",
  "monsters",
  "rules",
] as const;

rulesRouter.get("/:collection", (req, res, next) => {
  const { collection } = req.params;
  if (!collections.includes(collection as (typeof collections)[number])) {
    return next();
  }

  res.json({
    collection,
    message: "Pendiente implementar lectura desde SQLite",
    filters: req.query,
    items: [],
  });
});

rulesRouter.get("/:collection/:id", (req, res, next) => {
  const { collection, id } = req.params;
  if (!collections.includes(collection as (typeof collections)[number])) {
    return next();
  }

  res.json({
    collection,
    id,
    message: "Pendiente implementar detalle desde SQLite",
  });
});
