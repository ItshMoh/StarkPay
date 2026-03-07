# Contracts

Phase 4 integration status:
- `PayrollDispatcher`
- `ShieldedPool`
- `MockProofVerifier` (test verifier for integration checks)

Current scope:
- Access control and policy/session constraints
- Batch queue/execute bookkeeping for payroll flows
- Root/nullifier tracking primitives for shielded pool state
- Verifier-integrated shielded methods:
  - `deposit`
  - `spend`
  - `withdraw`
- Event emission and failure guards
