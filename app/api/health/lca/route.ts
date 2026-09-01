import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, any> = {
    database: false,
    ec3KeyConfigured: Boolean(
      process.env.EC3_API_KEY || process.env.OPENEPD_API_TOKEN
    ),
    ec3PersistenceAllowed: process.env.EC3_ALLOW_PERSISTENCE === "true",
    revitWebhookConfigured: Boolean(process.env.REVIT_WEBHOOK_KEY),
  };

  try {
    await db.query("SELECT 1");
    checks.database = true;
  } catch (error) {
    checks.databaseError =
      error instanceof Error ? error.message : "Unknown database error";
  }

  const ok = checks.database && checks.ec3KeyConfigured;

  return NextResponse.json(
    {
      success: ok,
      service: "LCA V2 backend",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}