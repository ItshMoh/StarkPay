import { parseAmountToUnits, toDenominationBundle } from "./denominations.js";
import type { CsvValidationError, ParsedCsvResult, ParsedPayrollRow } from "./types.js";

const REQUIRED_HEADER = ["wallet_address", "amount", "employee_name"];

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  if (inQuotes) {
    throw new Error("Unclosed quote");
  }

  cells.push(current.trim());
  return cells;
}

function isValidStarknetAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value);
}

function validateEmployeeName(value: string): string | null {
  if (!value.trim()) {
    return "Employee name is required";
  }

  if (value.length > 128) {
    return "Employee name is too long";
  }

  return null;
}

export function parsePayrollCsv(csvText: string): ParsedCsvResult {
  const trimmed = csvText.trim();
  if (!trimmed) {
    return {
      validRows: [],
      invalidRows: [{ rowNumber: 1, raw: "", errors: ["CSV content is empty"] }],
    };
  }

  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return {
      validRows: [],
      invalidRows: [{ rowNumber: 1, raw: "", errors: ["CSV content is empty"] }],
    };
  }

  const headerCells = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const headerMatches =
    headerCells.length === REQUIRED_HEADER.length &&
    REQUIRED_HEADER.every((name, index) => headerCells[index] === name);

  if (!headerMatches) {
    return {
      validRows: [],
      invalidRows: [
        {
          rowNumber: 1,
          raw: lines[0],
          errors: [
            `Invalid CSV header. Expected: ${REQUIRED_HEADER.join(",")}`,
          ],
        },
      ],
    };
  }

  const validRows: ParsedPayrollRow[] = [];
  const invalidRows: CsvValidationError[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const line = lines[i];
    const errors: string[] = [];

    let cells: string[] = [];
    try {
      cells = parseCsvLine(line);
    } catch (error) {
      invalidRows.push({
        rowNumber,
        raw: line,
        errors: [error instanceof Error ? error.message : "Invalid CSV row"],
      });
      continue;
    }

    if (cells.length !== 3) {
      invalidRows.push({
        rowNumber,
        raw: line,
        errors: ["Row must contain exactly 3 columns"],
      });
      continue;
    }

    const [walletAddressRaw, amountRaw, employeeNameRaw] = cells;
    const walletAddress = walletAddressRaw.trim();
    const amount = amountRaw.trim();
    const employeeName = employeeNameRaw.trim();

    if (!isValidStarknetAddress(walletAddress)) {
      errors.push("wallet_address must be a valid 0x-prefixed hex string");
    }

    const nameError = validateEmployeeName(employeeName);
    if (nameError) {
      errors.push(nameError);
    }

    let amountUnits = 0;
    let denominationBundle: ParsedPayrollRow["denominationBundle"] | undefined;

    try {
      amountUnits = parseAmountToUnits(amount);
      denominationBundle = toDenominationBundle(amountUnits);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid amount");
    }

    if (errors.length > 0 || !denominationBundle) {
      invalidRows.push({ rowNumber, raw: line, errors });
      continue;
    }

    validRows.push({
      rowNumber,
      walletAddress,
      amount,
      amountUnits,
      employeeName,
      denominationBundle,
    });
  }

  return { validRows, invalidRows };
}
