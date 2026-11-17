// Parses amounts and measurements typed in Dutch or English notation:
// "1234.50", "1234,50", "1.234,50", "12.500" (Dutch thousands), "€ 950".
export function parseAmount(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const s = String(v).trim().replace(/[€\s]/g, "");
  if (s === "") return null;
  const normalized = s.includes(",")
    ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s)
      ? s.replace(/\./g, "")
      : s;
  return Number(normalized);
}
