#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

node "${SCRIPT_DIR}/generate_input.js"

(
  cd "${PROJECT_DIR}"
  nargo execute phase3_witness
)
