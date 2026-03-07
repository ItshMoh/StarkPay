# payroll_circuits (Phase 3)

Noir circuit package for the first working privacy primitives used by the shielded payroll flow.

## What this circuit enforces

- Fixed denomination spends only (`1`, `5`, `10` units).
- Note commitment consistency (`note_secret`, owner key, amount, nonce).
- Spend authorization by requiring knowledge of the owner secret used by the input note.
- Nullifier consistency from the spent note secret/nonce pair.
- Merkle inclusion proof for the input note commitment.
- Output note commitment consistency for the recipient.

## Run tests

```bash
cd circuits/payroll_circuits
nargo test
```

The test suite includes:
- One valid spend vector that must pass.
- Invalid denomination, Merkle path, nullifier, and owner-secret vectors that must fail.

## Witness generation

```bash
cd circuits/payroll_circuits
./scripts/generate_witness.sh
```

This command:
1. Generates a deterministic `Prover.toml` test vector.
2. Executes the circuit (`nargo execute phase3_witness`) to produce a witness.

## Proof generation

```bash
cd circuits/payroll_circuits
./scripts/generate_proof.sh
```

Requirements:
- `bb` (Barretenberg backend) must be installed and available in `PATH`.

If `bb` is missing, the script exits with a clear install reminder.
