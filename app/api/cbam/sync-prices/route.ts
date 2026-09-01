import { NextResponse } from "next/server";
import { syncOfficialCbamPrices } from "@/lib/cbam-price-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authorized = (request: Request) => {
  const expected =
    process.env.CBAM_CRON_SECRET || process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  return Boolean(expected && auth === `Bearer ${expected}`);
};

const run = async (request: Request) => {
  if (!authorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await syncOfficialCbamPrices({
      force: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("CBAM price sync failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CBAM price sync failed.",
      },
      { status: 500 }
    );
  }
};

// POST remains compatible with the route you already tested.
export async function POST(request: Request) {
  return run(request);
}

// GET is useful for hosting platforms whose cron scheduler only performs GET.
// It remains protected by the same Bearer secret.
export async function GET(request: Request) {
  return run(request);
}
