import { Router } from "express";

export const searchRouter = Router();

searchRouter.get("/search", (req, res) => {
  res.json({
    query: req.query.q ?? "",
    message: "Pendiente implementar busqueda FTS5",
    total: 0,
    results: [],
  });
});
