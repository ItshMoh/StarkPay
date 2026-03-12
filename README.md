# StarkPay — Privacy-First On-Chain Payroll

StarkPay is a privacy-focused payroll system built on Starknet Sepolia (testnet). It enables employers to run batch salary payments in crypto while shielding employee payment details through a zero-knowledge shielded pool.

On-chain payroll today has a fundamental problem: every payment is publicly visible. Anyone with a block explorer can see who paid whom and how much. StarkPay fixes this by routing payments through a ZK shielded pool that breaks the on-chain link between employer and employee.

## Quick Start -- Try It Out

1. Install a Starknet wallet (Braavos or ArgentX) and switch to **Sepolia testnet**.
2. Open the app and connect your wallet.
3. Go to the **Mint** page and mint some spBTC tokens to your wallet. These are free testnet tokens with no real value.
4. Go to **Send**, upload a CSV file with columns `wallet_address,amount,employee_name`, and execute the payroll batch.
5. Switch to the **Employee** page with a recipient wallet to view encrypted receipts and withdraw funds.

> **Note:** spBTC is our custom ERC20 token deployed on Starknet Sepolia. You need spBTC tokens in your wallet before you can run payroll. Use the in-app Mint page to get tokens instantly -- no external faucet needed.

## How It Works

1. **Upload CSV** -- Employer uploads a payroll file (wallet address, amount, employee name). The system validates entries and converts amounts into fixed-denomination note bundles.
2. **Batch Deposit** -- Tokens transfer from the employer wallet into the shielded pool. Each payment becomes a cryptographic note commitment stored on-chain in a Merkle tree.
3. **Shielded Transfer** -- ZK proofs sever the link between sender and recipient. The payment exists on-chain, but no observer can determine who paid whom.
4. **Employee Withdraw** -- Employees prove ownership of a note via a ZK proof. The shielded pool verifies the proof, marks the nullifier as spent, and releases tokens to the employee wallet.

## Privacy Model

The system uses a true shielded pool design:

- **Deposit**: funds enter the pool as note commitments
- **Spend/Transfer**: shielded notes are spent privately and replaced with new commitments
- **Withdraw**: recipients exit to public balances by providing a valid ZK proof
- **Nullifiers**: prevent double-spending of notes
- **Merkle tree**: maintains commitment inclusion for proof verification

Employee names and payroll metadata are stored off-chain with encryption. Only the minimum cryptographic data lives on-chain.

Transfers use fixed note denominations (0.01 / 0.05 / 0.1 units) to reduce circuit complexity while keeping the MVP robust.

## Project Structure

```
onchainpayroll/
  contracts/          Cairo smart contracts (PayrollDispatcher, ShieldedPool)
  circuits/           Noir ZK circuits (note commitment, nullifier, Merkle inclusion)
  apps/web/           React + TypeScript frontend (employer and employee flows)
  services/api/       Node.js + TypeScript off-chain service (CSV processing, encrypted blob storage)
  shared/             Shared types, schemas, and constants
```

## Tech Stack

- **Starknet Sepolia** -- deployment network (testnet)
- **Cairo** -- smart contract language for PayrollDispatcher and ShieldedPool
- **Noir** -- ZK circuit language for privacy primitives
- **Garaga** -- generates Starknet verifier contracts from circuit artifacts
- **React + TypeScript** -- frontend application
- **Node.js + TypeScript** -- off-chain API service

## Key Features

- One-click batch payroll execution through the Payroll Dispatcher contract
- CSV payroll upload with validation and denomination breakdown preview
- ZK-shielded payment path that hides sender-recipient links on-chain
- Nullifier-based double-spend protection
- Employee dashboard for viewing decrypted payroll metadata and withdrawing funds
- Session keys for employers to authorize bounded payroll actions without repeated wallet prompts

## Getting Started

### Prerequisites

- Node.js (v18+)
- Starknet tooling: starkup, scarb, snforge
- Noir toolchain (for circuit compilation)
- A Starknet-compatible wallet (Braavos or ArgentX)

### Install Dependencies

```bash
npm install
```

### Run the Frontend

```bash
cd apps/web
npm run dev
```

### Run the API Service

```bash
cd services/api
npm run dev
```

### Compile Contracts

```bash
cd contracts
scarb build
```

### Run Contract Tests

```bash
cd contracts
snforge test
```

## Network Configuration

- Network: Starknet Sepolia testnet
- Asset: spBTC -- our custom ERC20 token deployed on Starknet Sepolia, used as the payroll denomination across all employer deposits and employee withdrawals

## Scope Limitations

- Testnet only -- no mainnet deployment
- Fixed denomination transfers only -- no arbitrary amount shielded circuits
- No full compliance or audit workflow in the current version

## License

ISC
