import { NextResponse } from "next/server";
import { resolveOfficialCbamReference } from "@/lib/cbam-official-reference";
import {
  boundedText,
  enforcePublicApiGuard,
  normalizeCnInput,
} from "@/lib/cbam-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const guard = await enforcePublicApiGuard(request, "reference", {
      limit: 120,
      windowSeconds: 300,
    });
    if (!guard.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many CBAM reference requests. Please retry shortly." },
        { status: 429, headers: guard.headers }
      );
    }

    const url = new URL(request.url);
    const cnRaw = boundedText(url.searchParams.get("cn"), 24);
    const cn = normalizeCnInput(cnRaw);
    const country = boundedText(url.searchParams.get("country"), 120);
    const reportingYear = Number(url.searchParams.get("reportingYear") || url.searchParams.get("year") || "2026");
    const productionRaw = url.searchParams.get("productionYear");
    const productionYear = productionRaw ? Number(productionRaw) : null;
    const mode = url.searchParams.get("mode") === "actual" ? "actual" : "default";
    const route = boundedText(url.searchParams.get("route"), 4).toUpperCase() || null;

    if (cn.length < 4 || !country) {
      return NextResponse.json(
        { success: false, error: "A valid CN/TARIC code and country are required." },
        { status: 400, headers: guard.headers }
      );
    }

    const result = await resolveOfficialCbamReference({
      cnCode: cn,
      country,
      reportingYear,
      productionYear,
      mode,
      productionRouteIndicator: route,
    });

    return NextResponse.json(
      { success: true, data: result },
      { headers: { ...guard.headers, "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("CBAM reference lookup failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "CBAM reference lookup failed." },
      { status: 500 }
    );
  }
}
