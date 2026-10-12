import { neon } from "@neondatabase/serverless";

export type PublicCbamPrice = {
  year: number;
  periodType: "quarterly" | "weekly";
  periodKey: string;
  periodStart: string | null;
  periodEnd: string | null;
  price: number;
  publishedAt: string | null;
};

/**
 * Last values confirmed from the European Commission's published figure
 * (Q1 2026, published 7 April 2026). Used only when the database is unreachable
 * so the public page never renders empty.
 */
const FALLBACK_PRICES: PublicCbamPrice[] = [
  {
    year: 2026,
    periodType: "quarterly",
    periodKey: "2026-Q1",
    periodStart: "2026-01-01",
    periodEnd: "2026-03-31",
    price: 75.36,
    publishedAt: "2026-04-07",
  },
];

const dateOnly = (value: unknown): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
};

export async function getOfficialCbamPrices(): Promise<{ prices: PublicCbamPrice[]; live: boolean }> {
  if (!process.env.DATABASE_URL) return { prices: FALLBACK_PRICES, live: false };
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT reporting_year, period_type, period_key, period_start, period_end, price_eur, published_at
      FROM cbam_certificate_prices
      WHERE official = TRUE AND price_eur IS NOT NULL
      ORDER BY COALESCE(period_start, published_at) ASC, period_key ASC
    `;
    const prices = rows
      .map((row): PublicCbamPrice => ({
        year: Number(row.reporting_year),
        periodType: row.period_type === "weekly" ? "weekly" : "quarterly",
        periodKey: String(row.period_key),
        periodStart: dateOnly(row.period_start),
        periodEnd: dateOnly(row.period_end),
        price: Number(row.price_eur),
        publishedAt: dateOnly(row.published_at),
      }))
      .filter((p) => Number.isFinite(p.price) && p.price > 0);
    if (!prices.length) return { prices: FALLBACK_PRICES, live: false };
    return { prices, live: true };
  } catch (error) {
    console.error("Public CBAM price load failed:", error);
    return { prices: FALLBACK_PRICES, live: false };
  }
}
