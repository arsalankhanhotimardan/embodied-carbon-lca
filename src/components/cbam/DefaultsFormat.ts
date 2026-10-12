import { defaultMarkupMultiplier } from "@/lib/cbam-official-reference";

export const fmt = (v: number | null, digits = 3) => (v === null ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }));

export const trim = (text: string | null, max = 110) => (!text ? "—" : text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** Default value with the Commission's year-specific mark-up applied, or null where no mark-up rule exists. */
export const withMarkup = (value: number | null, sector: string | null, year: number) => {
  if (value === null) return null;
  const m = defaultMarkupMultiplier(sector, year);
  return m === null ? null : value * m;
};

export const versionDate = (version: string) => version.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "2026-08-10";

/** Human-readable mark-up summary built from the same function the calculator uses. */
export function markupSummary(): { sector: string; label: string; y2026: string; y2027: string; y2028: string }[] {
  const sectors: [string, string][] = [
    ["iron_steel", "Iron and steel"],
    ["aluminium", "Aluminium"],
    ["cement", "Cement"],
    ["hydrogen", "Hydrogen"],
    ["fertiliser", "Fertilisers"],
  ];
  const pct = (m: number | null) => (m === null ? "—" : `+${Math.round((m - 1) * 100)}%`);
  return sectors.map(([sector, label]) => ({
    sector,
    label,
    y2026: pct(defaultMarkupMultiplier(sector, 2026)),
    y2027: pct(defaultMarkupMultiplier(sector, 2027)),
    y2028: pct(defaultMarkupMultiplier(sector, 2028)),
  }));
}
