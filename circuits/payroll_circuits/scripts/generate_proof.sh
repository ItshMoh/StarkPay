#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

if ! command -v bb >/dev/null 2>&1; then
  echo "Barretenberg binary 'bb' is not installed. Install it before running proof generation."
  exit 1
fi

node "${SCRIPT_DIR}/generate_input.js"

(
  cd "${PROJECT_DIR}"
  nargo prove phase3_proof
)
