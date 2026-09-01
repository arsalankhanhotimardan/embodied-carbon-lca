import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validKey = (provided: string | null): boolean => {
  const expected = process.env.REVIT_WEBHOOK_KEY;
  if (!expected || !provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function POST(request: Request) {
  if (!validKey(request.headers.get("x-revit-api-key"))) {
    return NextResponse.json(
      { success: false, error: "Invalid Revit API key." },
      { status: 401 }
    );
  }

  try {
    const payload = await request.json();
    const projectId = String(payload?.projectId || payload?.project_id || "").trim();
    const modelId = String(payload?.modelId || payload?.model_id || "").trim();
    const elements = Array.isArray(payload?.elements)
      ? payload.elements
      : Array.isArray(payload?.materials)
      ? payload.materials
      : [];

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "projectId is required." },
        { status: 400 }
      );
    }

    if (elements.length > 250_000) {
      return NextResponse.json(
        { success: false, error: "Too many elements in one sync." },
        { status: 413 }
      );
    }

    const canonical = JSON.stringify(payload);
    const checksum = createHash("sha256").update(canonical).digest("hex");

    const result = await db.query(
      `
      INSERT INTO bim_sync_events (
        project_id,
        model_id,
        element_count,
        checksum,
        payload
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      RETURNING id, received_at
      `,
      [
        projectId,
        modelId || null,
        elements.length,
        checksum,
        canonical,
      ]
    );

    return NextResponse.json({
      success: true,
      syncId: result.rows[0]?.id,
      receivedAt: result.rows[0]?.received_at,
      projectId,
      modelId: modelId || null,
      elementCount: elements.length,
      checksum,
    });
  } catch (error) {
    console.error("Revit webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process Revit sync." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  if (!validKey(request.headers.get("x-revit-api-key"))) {
    return NextResponse.json(
      { success: false, error: "Invalid Revit API key." },
      { status: 401 }
    );
  }

  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  if (!projectId) {
    return NextResponse.json(
      { success: false, error: "projectId is required." },
      { status: 400 }
    );
  }

  try {
    const result = await db.query(
      `
      SELECT
        id,
        project_id,
        model_id,
        element_count,
        checksum,
        payload,
        received_at
      FROM bim_sync_events
      WHERE project_id = $1
      ORDER BY received_at DESC
      LIMIT 1
      `,
      [projectId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Revit webhook GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch latest Revit sync." },
      { status: 500 }
    );
  }
}