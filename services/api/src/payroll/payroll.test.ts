import assert from "node:assert/strict";
import test from "node:test";
import { decryptMetadata, encryptMetadata, buildEncryptionKey } from "./crypto.js";
import { formatUnits, parseAmountToUnits, toDenominationBundle } from "./denominations.js";
import { parsePayrollCsv } from "./csv.js";
import { PayrollService } from "./service.js";

test("CSV parser validates header and malformed rows", () => {
  const invalidHeader = parsePayrollCsv("wallet,amount,employee\n0x1,0.000010,Alice");
  assert.equal(invalidHeader.validRows.length, 0);
  assert.equal(invalidHeader.invalidRows.length, 1);

  const malformedRows = parsePayrollCsv(
    [
      "wallet_address,amount,employee_name",
      "0x1234,0.000010,Alice",
      "no_hex_wallet,0.000020,Bob",
      "0x9876,not_a_number,Charlie",
      "0x8888,0.000005,",
    ].join("\n"),
  );

  assert.equal(malformedRows.validRows.length, 1);
  assert.equal(malformedRows.invalidRows.length, 3);
});

test("Denomination conversion handles fixed notes", () => {
  const units = parseAmountToUnits("0.000007");
  assert.equal(units, 7);

  const bundle = toDenominationBundle(units);
  assert.deepEqual(bundle, {
    note_5: 1,
    note_2: 1,
    note_1: 0,
    totalNotes: 2,
  });

  assert.equal(formatUnits(units), "0.000007");
});

test("Encryption and decryption roundtrip works", () => {
  const key = buildEncryptionKey("roundtrip-secret");
  const payload = {
    rowNumber: 2,
    walletAddress: "0xabc",
    amount: "0.000007",
    amountUnits: 7,
    employeeName: "Alice",
    denominationBundle: {
      note_5: 1,
      note_2: 1,
      note_1: 0,
      totalNotes: 2,
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
    "wallet_address,amount,employee_name\n0x1234,0.000005,Alice",
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

test("Wallet-based receipt lookup returns correct receipts", () => {
  const service = new PayrollService({
    encryptionSecret: "phase5-test-secret",
    decryptionContext: "phase5-test-context",
  });

  const csv = [
    "wallet_address,amount,employee_name",
    "0x1234,0.000005,Alice",
    "0x5678,0.000003,Bob",
    "0x1234,0.000002,Alice",
  ].join("\n");

  const ingest = service.ingestCsv(csv);
  assert.equal(ingest.validCount, 3);

  // Alice (0x1234) should have 2 receipts
  const aliceReceipts = service.getReceiptsByWallet("0x1234", false);
  assert.equal(aliceReceipts.length, 2);

  // Bob (0x5678) should have 1 receipt
  const bobReceipts = service.getReceiptsByWallet("0x5678", false);
  assert.equal(bobReceipts.length, 1);

  // Unknown wallet should have 0
  const unknownReceipts = service.getReceiptsByWallet("0x9999", false);
  assert.equal(unknownReceipts.length, 0);

  // With decryption context, should include metadata
  const aliceDecrypted = service.getReceiptsByWallet(
    "0x1234",
    true,
    "phase5-test-context",
  );
  assert.equal(aliceDecrypted.length, 2);
  assert.equal(aliceDecrypted[0].decryptionAllowed, true);
  assert.equal(aliceDecrypted[0].decryptedMetadata?.employeeName, "Alice");

  // With wrong context, should not decrypt
  const aliceWrongCtx = service.getReceiptsByWallet(
    "0x1234",
    true,
    "wrong-context",
  );
  assert.equal(aliceWrongCtx.length, 2);
  assert.equal(aliceWrongCtx[0].decryptionAllowed, false);
  assert.equal(aliceWrongCtx[0].decryptedMetadata, undefined);
});
