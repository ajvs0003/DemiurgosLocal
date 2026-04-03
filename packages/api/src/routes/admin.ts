import { Router } from "express";

export const adminRouter = Router();

adminRouter.post("/import-md", (_req, res) => {
  res.status(501).json({ message: "Pendiente implementar importacion de markdown" });
});

adminRouter.post("/upload-image", (_req, res) => {
  res.status(501).json({ message: "Pendiente implementar upload de imagenes" });
});

adminRouter.put("/:collection/:id", (req, res) => {
  res.status(501).json({
    message: "Pendiente implementar actualizacion de contenido Nae",
    params: req.params,
  });
});

adminRouter.delete("/:collection/:id", (req, res) => {
  res.status(501).json({
    message: "Pendiente implementar borrado de contenido Nae",
    params: req.params,
  });
});
