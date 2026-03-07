import "dotenv/config";
import cors from "cors";
import express from "express";
import { PayrollService } from "./payroll/service.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const payrollService = new PayrollService({
  ...(process.env.BLOB_STORAGE_ENCRYPTION_KEY || process.env.PAYROLL_BLOB_KEY
    ? {
        encryptionSecret:
          process.env.BLOB_STORAGE_ENCRYPTION_KEY || process.env.PAYROLL_BLOB_KEY,
      }
    : {}),
  ...(process.env.PAYROLL_DECRYPTION_CONTEXT
    ? { decryptionContext: process.env.PAYROLL_DECRYPTION_CONTEXT }
    : {}),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/payroll/csv", (req, res) => {
  const csv = req.body?.csv;
  if (typeof csv !== "string") {
    res.status(400).json({ error: "Request body must include a csv string" });
    return;
  }

  const result = payrollService.ingestCsv(csv);
  const statusCode = result.validCount > 0 ? 200 : 400;
  res.status(statusCode).json(result);
});

app.get("/receipts/:receiptId", (req, res) => {
  const includeDecrypted = req.query.include_decrypted === "true";
  const decryptionContext = req.header("x-decryption-context") ?? undefined;

  const receipt = payrollService.getReceipt(
    req.params.receiptId,
    includeDecrypted,
    decryptionContext,
  );

  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }

  res.json(receipt);
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on :${port}`);
});
