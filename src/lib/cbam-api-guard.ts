import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

export function boundedText(value: string | null | undefined, max = 160): string {
  return (value ?? "").trim().slice(0, max);
}

export function boundedNumber(
  value: unknown,
  options: { min?: number; max?: number; fallback?: number } = {}
): number {
  const n = Number(value);
  const fallback = options.fallback ?? 0;
  if (!Number.isFinite(n)) return fallback;
  if (options.min !== undefined && n < options.min) return options.min;
  if (options.max !== undefined && n > options.max) return options.max;
  return n;
}

export function normalizeCnInput(value: string): string {
  return boundedText(value, 24).replace(/\D/g, "");
}

export function publicClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export async function enforcePublicApiGuard(
  request: Request,
  routeKey: string,
  options: { limit?: number; windowSeconds?: number } = {}
) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const limit = Math.max(10, Math.trunc(options.limit ?? 120));
  const windowSeconds = Math.max(30, Math.trunc(options.windowSeconds ?? 300));
  const salt =
    process.env.CBAM_RATE_LIMIT_SALT ||
    process.env.CBAM_CRON_SECRET ||
    "cbam-public-rate-limit";

  const identity = `${routeKey}|${publicClientIp(request)}`;
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}|${identity}`)
    .digest("hex");

  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    INSERT INTO cbam_api_rate_limits (
      bucket_key,
      window_started_at,
      request_count,
      updated_at
    )
    VALUES (
      ${hash},
      NOW(),
      1,
      NOW()
    )
    ON CONFLICT (bucket_key)
    DO UPDATE SET
      window_started_at = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${windowSeconds} * INTERVAL '1 second')
          THEN NOW()
        ELSE cbam_api_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${windowSeconds} * INTERVAL '1 second')
          THEN 1
        ELSE cbam_api_rate_limits.request_count + 1
      END,
      updated_at = NOW()
    RETURNING window_started_at, request_count
  `;

  const count = Number(rows[0]?.request_count || 0);
  const started = new Date(rows[0]?.window_started_at || Date.now()).getTime();
  const retryAfter = Math.max(
    1,
    Math.ceil((started + windowSeconds * 1000 - Date.now()) / 1000)
  );

  return {
    allowed: count <= limit,
    limit,
    count,
    retryAfter,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(Math.max(0, limit - count)),
      "Retry-After": String(retryAfter),
    },
  };
}

export async function readJsonWithLimit<T>(
  request: Request,
  maxBytes = 256_000
): Promise<T> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new Error("Request body is too large.");

  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error("Request body is too large.");
  }

  return JSON.parse(text) as T;
}
