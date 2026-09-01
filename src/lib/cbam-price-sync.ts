import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const PRICE_PAGE =
  "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en";

const SYNC_KEY = "official_certificate_prices";

type ParsedPrice = {
  reportingYear: number;
  periodType: "quarterly" | "weekly";
  periodKey: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4" | null;
  weekNumber: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  price: number;
  publishedAt: string | null;
};

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&euro;|&#8364;/gi, "€")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tableRows = (html: string): string[][] => {
  const rows: string[][] = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  for (const rowMatch of html.matchAll(rowRegex)) {
    const cells: string[] = [];
    const cellRegex = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;

    for (const cellMatch of rowMatch[1].matchAll(cellRegex)) {
      cells.push(decodeHtml(cellMatch[1]));
    }

    if (cells.some(Boolean)) rows.push(cells);
  }

  return rows;
};

const parsePrice = (cells: string[]): number | null => {
  // Prefer the final cell because the Commission price table places the price
  // after the application/publication period columns.
  for (const cell of [...cells].reverse()) {
    const matches = [...cell.matchAll(/(?:€\s*)?(\d{1,3})[,.](\d{2,6})\b/g)];

    for (const match of matches.reverse()) {
      const value = Number(`${match[1]}.${match[2]}`);
      if (Number.isFinite(value) && value > 1 && value < 1000) {
        return value;
      }
    }
  }

  return null;
};

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseDateText = (text: string): string | null => {
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);
  if (dmy) return isoDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  const named = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );

  if (named) {
    return isoDate(
      Number(named[3]),
      MONTHS[named[2].toLowerCase()],
      Number(named[1])
    );
  }

  return null;
};

const isoWeek = (dateString: string): { year: number; week: number } => {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(date.getUTCDate() + 4 - day);

  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));

  const week = Math.ceil(
    (((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
  );

  return { year: isoYear, week };
};

const isoWeekBounds = (year: number, week: number) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
};

const quarterBounds = (
  year: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
) => {
  const bounds = {
    Q1: [`${year}-01-01`, `${year}-03-31`],
    Q2: [`${year}-04-01`, `${year}-06-30`],
    Q3: [`${year}-07-01`, `${year}-09-30`],
    Q4: [`${year}-10-01`, `${year}-12-31`],
  } as const;

  return bounds[quarter];
};

const parseOfficialRows = (html: string): ParsedPrice[] => {
  const parsed = new Map<string, ParsedPrice>();

  for (const cells of tableRows(html)) {
    const joined = cells.join(" | ");
    const price = parsePrice(cells);

    if (price === null) continue;

    const quarterMatch = joined.match(/\b(Q[1-4])\s*(20\d{2})\b/i);

    if (quarterMatch) {
      const quarter = quarterMatch[1].toUpperCase() as
        | "Q1"
        | "Q2"
        | "Q3"
        | "Q4";
      const year = Number(quarterMatch[2]);

      // Under the current methodology only 2026 uses quarterly prices.
      if (year === 2026) {
        const [periodStart, periodEnd] = quarterBounds(year, quarter);
        const publicationDate =
          cells.map(parseDateText).find(Boolean) ?? null;

        const item: ParsedPrice = {
          reportingYear: year,
          periodType: "quarterly",
          periodKey: `${year}-${quarter}`,
          quarter,
          weekNumber: null,
          periodStart,
          periodEnd,
          price,
          publishedAt: publicationDate,
        };

        parsed.set(item.periodKey, item);
        continue;
      }
    }

    const explicitYearWeek =
      joined.match(/\b(20\d{2})\s*[-/]?\s*W(?:EEK)?\s*0?(\d{1,2})\b/i) ||
      joined.match(/\bW(?:EEK)?\s*0?(\d{1,2})\s*[-/,]?\s*(20\d{2})\b/i) ||
      joined.match(/\bWEEK\s*0?(\d{1,2})\b[\s\S]*?\b(20\d{2})\b/i);

    let year: number | null = null;
    let week: number | null = null;

    if (explicitYearWeek) {
      const first = Number(explicitYearWeek[1]);
      const second = Number(explicitYearWeek[2]);

      if (first >= 2027) {
        year = first;
        week = second;
      } else {
        week = first;
        year = second;
      }
    }

    const dateCandidates = cells
      .map(parseDateText)
      .filter((value): value is string => Boolean(value));

    if ((year === null || week === null) && dateCandidates.length) {
      const derived = isoWeek(dateCandidates[0]);
      if (derived.year >= 2027) {
        year = derived.year;
        week = derived.week;
      }
    }

    if (
      year === null ||
      week === null ||
      year < 2027 ||
      week < 1 ||
      week > 53
    ) {
      continue;
    }

    const bounds = isoWeekBounds(year, week);
    const publishedAt =
      dateCandidates.length > 1
        ? dateCandidates[1]
        : dateCandidates[0] ?? null;

    const item: ParsedPrice = {
      reportingYear: year,
      periodType: "weekly",
      periodKey: `${year}-W${String(week).padStart(2, "0")}`,
      quarter: null,
      weekNumber: week,
      periodStart: bounds.start,
      periodEnd: bounds.end,
      price,
      publishedAt,
    };

    parsed.set(item.periodKey, item);
  }

  return [...parsed.values()].sort((a, b) =>
    a.periodKey.localeCompare(b.periodKey)
  );
};

export async function syncOfficialCbamPrices(options?: {
  force?: boolean;
  minIntervalHours?: number;
}) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const force = Boolean(options?.force);
  const minIntervalHours = Math.max(1, options?.minIntervalHours ?? 12);

  const stateRows = await sql`
    SELECT
      last_attempt_at,
      last_success_at,
      last_error,
      last_items_saved
    FROM cbam_sync_state
    WHERE sync_key = ${SYNC_KEY}
    LIMIT 1
  `;

  const lastAttempt = stateRows[0]?.last_attempt_at
    ? new Date(stateRows[0].last_attempt_at).getTime()
    : 0;

  const stale =
    !lastAttempt ||
    Date.now() - lastAttempt >= minIntervalHours * 60 * 60 * 1000;

  if (!force && !stale) {
    return {
      success: true,
      skipped: true,
      reason: `Last automatic price-sync attempt was less than ${minIntervalHours} hours ago.`,
      saved: [],
    };
  }

  // Mark the attempt before fetching so concurrent public page loads do not
  // all hit the Commission website at once.
  await sql`
    INSERT INTO cbam_sync_state (
      sync_key,
      last_attempt_at,
      updated_at
    )
    VALUES (
      ${SYNC_KEY},
      NOW(),
      NOW()
    )
    ON CONFLICT (sync_key)
    DO UPDATE SET
      last_attempt_at = NOW(),
      updated_at = NOW()
  `;

  try {
    const response = await fetch(PRICE_PAGE, {
      headers: {
        "User-Agent":
          "GreenEngineeringTools-CBAM-PriceSync/2.0 (+https://greenengineeringtools.com)",
        Accept: "text/html",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Commission certificate-price page returned HTTP ${response.status}.`
      );
    }

    const html = await response.text();
    const sourceSha256 = crypto.createHash("sha256").update(html).digest("hex");
    const extracted = parseOfficialRows(html);

    if (!extracted.length) {
      throw new Error(
        "No explicit official CBAM price rows could be parsed. Existing database prices were left unchanged."
      );
    }

    // Known 2026 controls protect against silently parsing the wrong table/cell.
    const q1 = extracted.find((item) => item.periodKey === "2026-Q1");
    const q2 = extracted.find((item) => item.periodKey === "2026-Q2");
    if (q1 && Math.abs(q1.price - 75.36) > 0.001) {
      throw new Error(`Certificate-price parser control failed for 2026-Q1: ${q1.price}.`);
    }
    if (q2 && Math.abs(q2.price - 75.28) > 0.001) {
      throw new Error(`Certificate-price parser control failed for 2026-Q2: ${q2.price}.`);
    }

    const saved: Array<{
      periodKey: string;
      year: number;
      price: number;
      periodType: string;
    }> = [];

    for (const item of extracted) {
      const existingRows = await sql`
        SELECT price_eur
        FROM cbam_certificate_prices
        WHERE period_key = ${item.periodKey}
        LIMIT 1
      `;
      const previous = existingRows[0]?.price_eur === undefined
        ? null
        : Number(existingRows[0].price_eur);
      const changeType = previous === null
        ? "insert"
        : Math.abs(previous - item.price) > 1e-9
          ? "correction"
          : "refresh";

      await sql`
        INSERT INTO cbam_certificate_price_history (
          period_key, previous_price_eur, new_price_eur, source_url, source_sha256, change_type
        ) VALUES (
          ${item.periodKey}, ${previous}, ${item.price}, ${PRICE_PAGE}, ${sourceSha256}, ${changeType}
        )
      `;

      await sql`
        INSERT INTO cbam_certificate_prices (
          reporting_year,
          period_type,
          period_key,
          quarter,
          week_number,
          period_start,
          period_end,
          price_eur,
          official,
          published_at,
          source_url,
          updated_at
        )
        VALUES (
          ${item.reportingYear},
          ${item.periodType},
          ${item.periodKey},
          ${item.quarter},
          ${item.weekNumber},
          ${item.periodStart}::date,
          ${item.periodEnd}::date,
          ${item.price},
          TRUE,
          COALESCE(${item.publishedAt}::date, CURRENT_DATE)::timestamptz,
          ${PRICE_PAGE},
          NOW()
        )
        ON CONFLICT (period_key)
        DO UPDATE SET
          reporting_year = EXCLUDED.reporting_year,
          period_type = EXCLUDED.period_type,
          quarter = EXCLUDED.quarter,
          week_number = EXCLUDED.week_number,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          price_eur = EXCLUDED.price_eur,
          official = TRUE,
          published_at = EXCLUDED.published_at,
          source_url = EXCLUDED.source_url,
          updated_at = NOW()
      `;

      saved.push({
        periodKey: item.periodKey,
        year: item.reportingYear,
        price: item.price,
        periodType: item.periodType,
      });
    }

    await sql`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_success_at,
        last_error,
        last_items_saved,
        updated_at
      )
      VALUES (
        ${SYNC_KEY},
        NOW(),
        NOW(),
        NULL,
        ${saved.length},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_attempt_at = NOW(),
        last_success_at = NOW(),
        last_error = NULL,
        last_items_saved = ${saved.length},
        updated_at = NOW()
    `;

    return {
      success: true,
      skipped: false,
      source: PRICE_PAGE,
      sourceSha256,
      saved,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown CBAM price sync error.";

    await sql`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_error,
        updated_at
      )
      VALUES (
        ${SYNC_KEY},
        NOW(),
        ${message},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_error = ${message},
        updated_at = NOW()
    `;

    throw error;
  }
}
