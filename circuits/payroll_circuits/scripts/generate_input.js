#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const TREE_HEIGHT = 8;
const DOMAIN_OWNER_KEY = 1001n;
const DOMAIN_NOTE_COMMITMENT = 2001n;
const DOMAIN_NULLIFIER = 3001n;
const DOMAIN_MERKLE_BASE = 4001n;

const ownerSecret = 101n;
const noteSecret = 202n;
const noteNonce = 303n;
const amount = 5n;
const siblings = [11n, 22n, 33n, 44n, 55n, 66n, 77n, 88n];
const pathIndices = [0, 1, 0, 1, 0, 0, 1, 1];
const newNoteSecret = 404n;
const newNoteNonce = 505n;
const recipientPubkey = 606n;

if (siblings.length !== TREE_HEIGHT || pathIndices.length !== TREE_HEIGHT) {
  throw new Error(`Expected ${TREE_HEIGHT} Merkle levels in fixture data.`);
}

function mod(value) {
  const reduced = value % PRIME;
  return reduced >= 0n ? reduced : reduced + PRIME;
}

function mix(state, value, roundConstant) {
  const x = mod(state + value + roundConstant + 17n);
  return mod(x * mod(x + 23n));
}

function hashOne(value, domain) {
  let state = domain;
  state = mix(state, value, 1n);
  return mix(state, domain, 2n);
}

function hashTwo(left, right, domain) {
  let state = domain;
  state = mix(state, left, 3n);
  state = mix(state, right, 5n);
  return mix(state, domain, 7n);
}

function hashFour(a, b, c, d, domain) {
  let state = domain;
  state = mix(state, a, 11n);
  state = mix(state, b, 13n);
  state = mix(state, c, 17n);
  state = mix(state, d, 19n);
  return mix(state, domain, 23n);
}

function computeOwnerPubkey(secret) {
  return hashOne(secret, DOMAIN_OWNER_KEY);
}

function computeNoteCommitment(secret, ownerPubkey, noteAmount, nonce) {
  return hashFour(secret, ownerPubkey, noteAmount, nonce, DOMAIN_NOTE_COMMITMENT);
}

function computeNullifier(secret, nonce) {
  return hashTwo(secret, nonce, DOMAIN_NULLIFIER);
}

function computeMerkleRoot(leaf, merkleSiblings, merklePathIndices) {
  let current = leaf;

  for (let i = 0; i < TREE_HEIGHT; i += 1) {
    const direction = merklePathIndices[i];
    if (direction !== 0 && direction !== 1) {
      throw new Error(`Invalid Merkle direction at level ${i}: ${direction}`);
    }

    const domain = DOMAIN_MERKLE_BASE + BigInt(i);
    if (direction === 0) {
      current = hashTwo(current, merkleSiblings[i], domain);
    } else {
      current = hashTwo(merkleSiblings[i], current, domain);
    }
  }

  return current;
}

const ownerPubkey = computeOwnerPubkey(ownerSecret);
const noteCommitment = computeNoteCommitment(noteSecret, ownerPubkey, amount, noteNonce);
const merkleRoot = computeMerkleRoot(noteCommitment, siblings, pathIndices);
const nullifier = computeNullifier(noteSecret, noteNonce);
const newCommitment = computeNoteCommitment(newNoteSecret, recipientPubkey, amount, newNoteNonce);

const lines = [
  `merkle_root = \"${merkleRoot.toString()}\"`,
  `nullifier = \"${nullifier.toString()}\"`,
  `new_commitment = \"${newCommitment.toString()}\"`,
  `owner_secret = \"${ownerSecret.toString()}\"`,
  `note_secret = \"${noteSecret.toString()}\"`,
  `note_nonce = \"${noteNonce.toString()}\"`,
  `amount = ${amount.toString()}`,
  `merkle_siblings = [${siblings.map((value) => `\"${value.toString()}\"`).join(', ')}]`,
  `merkle_path_indices = [${pathIndices.join(', ')}]`,
  `new_note_secret = \"${newNoteSecret.toString()}\"`,
  `new_note_nonce = \"${newNoteNonce.toString()}\"`,
  `recipient_pubkey = \"${recipientPubkey.toString()}\"`,
  '',
];

const proverTomlPath = path.resolve(__dirname, '..', 'Prover.toml');
fs.writeFileSync(proverTomlPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${proverTomlPath}`);
