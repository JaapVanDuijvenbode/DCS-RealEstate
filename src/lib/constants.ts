// Key dates from PRD v1.0 (14 November 2026).
export const KEY_DATES = [
  { date: "2026-12-15", key: "earlyAccess" },
  { date: "2027-01-15", key: "transfer" },
  { date: "2027-02-08", key: "moveIn", highlight: true },
  { date: "2027-02-15", key: "handover" },
] as const;

export const MOVE_IN_DATE = "2027-02-08";

export const DISPOSITIONS = ["zelf", "verhuisbedrijf", "achterlaten", "verkopen", "doneren", "afvoeren", "opslag"] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export const STATUSES = [
  "geinventariseerd", "ingepakt", "geladen", "aangekomen", "uitgepakt",
  "achtergelaten", "verkocht", "gedoneerd", "afgevoerd", "in_opslag",
] as const;
export type MoveStatus = (typeof STATUSES)[number];

export const SALE_STATUSES = ["te_koop", "gereserveerd", "verkocht", "opgehaald"] as const;

export const CATEGORIES = ["meubel", "apparaat", "elektronica", "verlichting", "decoratie", "tuin", "gereedschap", "overig"] as const;

// Label band colour per destination floor at Nieuwe Rijn 98 (LayeredCake palette,
// darkened where needed so white text stays readable on print).
export const FLOOR_COLORS: Record<string, string> = {
  BG: "#932B49",
  "1E": "#C23B4B",
  "2E": "#8A4316",
  ZO: "#671343",
  EXT: "#6B5160",
};
