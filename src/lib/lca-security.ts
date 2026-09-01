import { NextResponse } from "next/server";

export function normalizeMaterialName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Lightweight CSRF/origin protection for browser writes.
 * This is NOT a replacement for proper SaaS authentication.
 */
export function rejectCrossOriginWrite(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return null;

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json(
        { success: false, error: "Cross-origin write rejected." },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid Origin header." },
      { status: 403 }
    );
  }

  return null;
}

export function jsonSizeGuard(request: Request, maxBytes = 1_000_000): NextResponse | null {
  const length = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > maxBytes) {
    return NextResponse.json(
      { success: false, error: "Request payload is too large." },
      { status: 413 }
    );
  }
  return null;
}

export function isEc3PersistenceAllowed(): boolean {
  return process.env.EC3_ALLOW_PERSISTENCE === "true";
}