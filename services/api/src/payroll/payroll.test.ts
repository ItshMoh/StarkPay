import assert from "node:assert/strict";
import test from "node:test";
import { decryptMetadata, encryptMetadata, buildEncryptionKey } from "./crypto.js";
import { formatUnits, parseAmountToUnits, toDenominationBundle } from "./denominations.js";
import { parsePayrollCsv } from "./csv.js";
import { PayrollService } from "./service.js";

test("CSV parser validates header and malformed rows", () => {
  const invalidHeader = parsePayrollCsv("wallet,amount,employee\n0x1,0.10,Alice");
  assert.equal(invalidHeader.validRows.length, 0);
  assert.equal(invalidHeader.invalidRows.length, 1);

  const malformedRows = parsePayrollCsv(
    [
      "wallet_address,amount,employee_name",
      "0x1234,0.10,Alice",
      "no_hex_wallet,0.20,Bob",
      "0x9876,not_a_number,Charlie",
      "0x8888,0.05,",
    ].join("\n"),
  );

  assert.equal(malformedRows.validRows.length, 1);
  assert.equal(malformedRows.invalidRows.length, 3);
});

test("Denomination conversion handles fixed notes", () => {
  const units = parseAmountToUnits("1.27");
  assert.equal(units, 127);

  const bundle = toDenominationBundle(units);
  assert.deepEqual(bundle, {
    note_0_10: 12,
    note_0_05: 1,
    note_0_01: 2,
    totalNotes: 15,
  });

  assert.equal(formatUnits(units), "1.27");
});

test("Encryption and decryption roundtrip works", () => {
  const key = buildEncryptionKey("roundtrip-secret");
  const payload = {
    rowNumber: 2,
    walletAddress: "0xabc",
    amount: "0.55",
    amountUnits: 55,
    employeeName: "Alice",
    denominationBundle: {
      note_0_10: 5,
      note_0_05: 1,
      note_0_01: 0,
      totalNotes: 6,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const encrypted = encryptMetadata(payload, key);
  const decrypted = decryptMetadata(encrypted, key);

  assert.deepEqual(decrypted, payload);
});

test("Receipt API behavior only decrypts with valid context", () => {
  const service = new PayrollService({
    encryptionSecret: "phase5-test-secret",
    decryptionContext: "phase5-test-context",
  });

  const ingest = service.ingestCsv(
    "wallet_address,amount,employee_name\n0x1234,0.15,Alice",
  );

  assert.equal(ingest.validCount, 1);
  assert.equal(ingest.invalidCount, 0);

  const receiptId = ingest.receipts[0].receiptId;

  const encryptedOnly = service.getReceipt(receiptId, false);
  assert(encryptedOnly);
  assert.equal(encryptedOnly.decryptionAllowed, false);
  assert.equal(encryptedOnly.decryptedMetadata, undefined);

  const wrongContext = service.getReceipt(receiptId, true, "wrong-context");
  assert(wrongContext);
  assert.equal(wrongContext.decryptionAllowed, false);
  assert.equal(wrongContext.decryptedMetadata, undefined);

  const withContext = service.getReceipt(receiptId, true, "phase5-test-context");
  assert(withContext);
  assert.equal(withContext.decryptionAllowed, true);
  assert.equal(withContext.decryptedMetadata?.employeeName, "Alice");
});
