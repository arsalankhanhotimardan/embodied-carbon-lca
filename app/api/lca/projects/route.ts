import { randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonSizeGuard,
  rejectCrossOriginWrite,
} from "@/lib/lca-security";
import {
  hashProjectToken,
  LCA_APP_VERSION,
  LCA_CALC_ENGINE_VERSION,
  LCA_PROJECT_SCHEMA_VERSION,
  sanitizeProjectInput,
} from "@/lib/lca-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      mode: "project-key",
      message:
        "For privacy, projects are not globally enumerable. The browser keeps the project IDs and project keys it created.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const originError = rejectCrossOriginWrite(request);
  if (originError) return originError;

  const sizeError = jsonSizeGuard(request);
  if (sizeError) return sizeError;

  try {
    const input = sanitizeProjectInput(await request.json());
    const id = randomUUID();
    const editToken = randomBytes(32).toString("base64url");
    const editTokenHash = hashProjectToken(editToken);

    const result = await db.query(
      `
      INSERT INTO lca_projects (
        id,
        name,
        edit_token_hash,
        schema_version,
        app_version,
        calculation_engine_version,
        study_period_years,
        floor_area_m2,
        annual_energy_kwh,
        grid_intensity,
        baseline_rows,
        proposed_rows,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11::jsonb,$12::jsonb,$13::jsonb,NOW(),NOW()
      )
      RETURNING
        id,
        name,
        schema_version,
        app_version,
        calculation_engine_version,
        created_at,
        updated_at
      `,
      [
        id,
        input.name,
        editTokenHash,
        LCA_PROJECT_SCHEMA_VERSION,
        LCA_APP_VERSION,
        LCA_CALC_ENGINE_VERSION,
        input.studyPeriodYears,
        input.floorAreaM2,
        input.annualEnergyKwh,
        input.gridIntensity,
        JSON.stringify(input.baselineRows),
        JSON.stringify(input.proposedRows),
        JSON.stringify(input.metadata),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        project: result.rows[0],
        editToken,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("LCA project create error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create LCA project.",
      },
      { status: 400 }
    );
  }
}
