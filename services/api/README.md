# API Service (Phase 5)

Phase 5 delivers:
- CSV upload parsing and validation for `wallet_address, amount, employee_name`
- Fixed denomination conversion (`0.10`, `0.05`, `0.01`)
- Encrypted payroll metadata blob storage
- Receipt retrieval API with decryption context checks

## Endpoints

- `GET /health`
- `POST /payroll/csv`
  - Body: `{ "csv": "wallet_address,amount,employee_name\\n0x1234,0.15,Alice" }`
  - Returns parsed rows, invalid rows, denomination bundles, and stored encrypted receipts
- `GET /receipts/:receiptId`
  - Returns encrypted payload by default
  - Add `?include_decrypted=true` and header `x-decryption-context: <value>` to receive decrypted metadata

## Environment

- `BLOB_STORAGE_ENCRYPTION_KEY` (preferred) or `PAYROLL_BLOB_KEY`
- `PAYROLL_DECRYPTION_CONTEXT`

## Commands

```bash
npm run dev --workspace @onchainpayroll/api
npm run typecheck --workspace @onchainpayroll/api
npm run test --workspace @onchainpayroll/api
```
