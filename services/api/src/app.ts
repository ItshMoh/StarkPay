import cors from "cors";
import express from "express";
import { PayrollService } from "./payroll/service.js";
import { SupabaseReceiptStore } from "./payroll/store.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const store = new SupabaseReceiptStore(supabaseUrl, supabaseKey);

const payrollService = new PayrollService(
  {
    ...(process.env.BLOB_STORAGE_ENCRYPTION_KEY || process.env.PAYROLL_BLOB_KEY
      ? {
          encryptionSecret:
            process.env.BLOB_STORAGE_ENCRYPTION_KEY || process.env.PAYROLL_BLOB_KEY,
        }
      : {}),
    ...(process.env.PAYROLL_DECRYPTION_CONTEXT
      ? { decryptionContext: process.env.PAYROLL_DECRYPTION_CONTEXT }
      : {}),
  },
  store,
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/payroll/csv", async (req, res) => {
  const csv = req.body?.csv;
  if (typeof csv !== "string") {
    res.status(400).json({ error: "Request body must include a csv string" });
    return;
  }

  const result = await payrollService.ingestCsv(csv);
  const statusCode = result.validCount > 0 ? 200 : 400;
  res.status(statusCode).json(result);
});

app.get("/receipts/wallet/:walletAddress", async (req, res) => {
  const includeDecrypted = req.query.include_decrypted === "true";
  const decryptionContext = req.header("x-decryption-context") ?? undefined;

  const receipts = await payrollService.getReceiptsByWallet(
    req.params.walletAddress,
    includeDecrypted,
    decryptionContext,
  );

  res.json({ receipts });
});

app.get("/receipts/:receiptId", async (req, res) => {
  const includeDecrypted = req.query.include_decrypted === "true";
  const decryptionContext = req.header("x-decryption-context") ?? undefined;

  const receipt = await payrollService.getReceipt(
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

export default app;
