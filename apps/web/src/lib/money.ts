/** "12,5" or "12.5" dinars typed in a form → 12500 millimes. Empty → null. */
export function parseDinars(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 1000);
}

/** 12500 millimes → "12.5" for an input field. */
export function millimesToInput(millimes: number | null | undefined): string {
  if (millimes === null || millimes === undefined) return '';
  return String(millimes / 1000);
}
