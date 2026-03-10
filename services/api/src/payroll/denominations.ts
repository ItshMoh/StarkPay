import type { DenominationBundle } from "./types.js";

const UNIT_SCALE = 1_000_000;
const DENOM_5 = 5;
const DENOM_2 = 2;
const DENOM_1 = 1;

export function parseAmountToUnits(amount: string): number {
  const normalized = amount.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error("Amount must be a positive decimal with up to 6 decimals");
  }

  const [wholeRaw, fractionRaw = ""] = normalized.split(".");
  const whole = Number(wholeRaw);
  const fraction = Number((fractionRaw + "000000").slice(0, 6));

  if (!Number.isInteger(whole) || !Number.isInteger(fraction)) {
    throw new Error("Amount is invalid");
  }

  const units = whole * UNIT_SCALE + fraction;
  if (units <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  return units;
}

export function formatUnits(units: number): string {
  const whole = Math.floor(units / UNIT_SCALE);
  const fraction = String(units % UNIT_SCALE).padStart(6, "0");
  return `${whole}.${fraction}`;
}

export function toDenominationBundle(amountUnits: number): DenominationBundle {
  if (!Number.isInteger(amountUnits) || amountUnits <= 0) {
    throw new Error("Amount units must be a positive integer");
  }

  let remainder = amountUnits;

  const note_5 = Math.floor(remainder / DENOM_5);
  remainder %= DENOM_5;

  const note_2 = Math.floor(remainder / DENOM_2);
  remainder %= DENOM_2;

  const note_1 = Math.floor(remainder / DENOM_1);
  remainder %= DENOM_1;

  if (remainder !== 0) {
    throw new Error("Amount is not representable with fixed denominations");
  }

  return {
    note_5,
    note_2,
    note_1,
    totalNotes: note_5 + note_2 + note_1,
  };
}
