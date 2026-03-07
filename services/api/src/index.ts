import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
