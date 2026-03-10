export function shortAddress(address?: string, start = 6, end = 4): string {
  if (!address) return 'Not connected';
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatIsoDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

export function toAmountString(units: number): string {
  const whole = Math.floor(units / 1_000_000);
  const fraction = String(units % 1_000_000).padStart(6, '0');
  return `${whole}.${fraction}`;
}
