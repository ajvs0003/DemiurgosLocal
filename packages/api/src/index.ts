import cors from "cors";
import express from "express";
import path from "path";
import { rulesRouter } from "./routes/rules";
import { searchRouter } from "./routes/search";
import { adminRouter } from "./routes/admin";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/assets", express.static(path.resolve(__dirname, "../assets")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use(rulesRouter);
app.use(searchRouter);
app.use("/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
