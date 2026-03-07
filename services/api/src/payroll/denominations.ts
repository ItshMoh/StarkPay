import type { DenominationBundle } from "./types.js";

const UNIT_SCALE = 100;
const DENOM_0_10 = 10;
const DENOM_0_05 = 5;
const DENOM_0_01 = 1;

export function parseAmountToUnits(amount: string): number {
  const normalized = amount.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Amount must be a positive decimal with up to 2 decimals");
  }

  const [wholeRaw, fractionRaw = ""] = normalized.split(".");
  const whole = Number(wholeRaw);
  const fraction = Number((fractionRaw + "00").slice(0, 2));

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
  const fraction = String(units % UNIT_SCALE).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function toDenominationBundle(amountUnits: number): DenominationBundle {
  if (!Number.isInteger(amountUnits) || amountUnits <= 0) {
    throw new Error("Amount units must be a positive integer");
  }

  let remainder = amountUnits;

  const note_0_10 = Math.floor(remainder / DENOM_0_10);
  remainder %= DENOM_0_10;

  const note_0_05 = Math.floor(remainder / DENOM_0_05);
  remainder %= DENOM_0_05;

  const note_0_01 = Math.floor(remainder / DENOM_0_01);
  remainder %= DENOM_0_01;

  if (remainder !== 0) {
    throw new Error("Amount is not representable with fixed denominations");
  }

  return {
    note_0_10,
    note_0_05,
    note_0_01,
    totalNotes: note_0_10 + note_0_05 + note_0_01,
  };
}
