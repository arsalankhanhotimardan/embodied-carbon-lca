import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonSizeGuard,
  normalizeMaterialName,
  rejectCrossOriginWrite,
} from "@/lib/lca-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        alias,
        normalized_alias,
        epd_external_id AS epd_id,
        created_at,
        updated_at
      FROM material_mappings
      ORDER BY updated_at DESC
    `);

    return NextResponse.json(
      { success: true, data: result.rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Material mapping GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch material mappings." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOriginWrite(request);
  if (originError) return originError;

  const sizeError = jsonSizeGuard(request, 100_000);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const alias = String(body?.alias || "").trim();
    const epdId = String(body?.epdId || body?.epd_id || "").trim();

    if (!alias || !epdId) {
      return NextResponse.json(
        { success: false, error: "alias and epdId are required." },
        { status: 400 }
      );
    }

    if (alias.length > 500 || epdId.length > 200) {
      return NextResponse.json(
        { success: false, error: "Mapping value is too long." },
        { status: 400 }
      );
    }

    const normalizedAlias = normalizeMaterialName(alias);
    if (!normalizedAlias) {
      return NextResponse.json(
        { success: false, error: "Alias cannot be normalized." },
        { status: 400 }
      );
    }

    // Refuse mappings to an EPD that does not exist in the central EPD table.
    const existing = await db.query(
      `SELECT 1 FROM epd_materials WHERE external_id = $1 LIMIT 1`,
      [epdId]
    );

    if (!existing.rowCount) {
      return NextResponse.json(
        {
          success: false,
          error: "The target EPD has not been stored in epd_materials.",
        },
        { status: 409 }
      );
    }

    await db.query(
      `
      INSERT INTO material_mappings (
        alias,
        normalized_alias,
        epd_external_id,
        updated_at
      )
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (normalized_alias)
      DO UPDATE SET
        alias = EXCLUDED.alias,
        epd_external_id = EXCLUDED.epd_external_id,
        updated_at = NOW()
      `,
      [alias, normalizedAlias, epdId]
    );

    // Also keep the alias on the EPD object itself.
    await db.query(
      `
      UPDATE epd_materials
      SET
        aliases = (
          SELECT COALESCE(jsonb_agg(DISTINCT alias_value), '[]'::jsonb)
          FROM jsonb_array_elements_text(
            COALESCE(aliases, '[]'::jsonb) || to_jsonb(ARRAY[$2::text])
          ) AS merged(alias_value)
        ),
        updated_at = NOW()
      WHERE external_id = $1
      `,
      [epdId, alias]
    );

    return NextResponse.json({
      success: true,
      data: { alias, normalizedAlias, epdId },
    });
  } catch (error) {
    console.error("Material mapping POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to persist material mapping." },
      { status: 500 }
    );
  }
}