import cors from "cors";
import express from "express";
import { rulesRouter } from "./routes/rules";
import { searchRouter } from "./routes/search";
import { adminRouter } from "./routes/admin";
import { ensureApiDirectories, getAssetsRoot } from "./services/paths";
import { closeAllDbs } from "./services/database";

ensureApiDirectories();

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: ["text/markdown", "text/plain"], limit: "5mb" }));

app.use("/assets", express.static(getAssetsRoot()));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(rulesRouter);
app.use(searchRouter);
app.use("/admin", adminRouter);

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      closeAllDbs();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
