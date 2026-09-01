import { NextResponse } from "next/server";
import { syncOfficialCbamReferenceData } from "@/lib/cbam-reference-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authorised = (request: Request) => {
  const secret = process.env.CBAM_CRON_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
};

async function run(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await syncOfficialCbamReferenceData({ force: true });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("CBAM reference sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Reference sync failed.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return run(request);
}

// Some hosting schedulers only issue GET requests. It remains secret-protected.
export async function GET(request: Request) {
  return run(request);
}
