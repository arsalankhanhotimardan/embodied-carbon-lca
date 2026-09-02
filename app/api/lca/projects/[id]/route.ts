import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonSizeGuard,
  rejectCrossOriginWrite,
} from "@/lib/lca-security";
import {
  LCA_APP_VERSION,
  LCA_CALC_ENGINE_VERSION,
  projectTokenMatches,
  readProjectToken,
  sanitizeProjectInput,
} from "@/lib/lca-projects";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const projectId = async (context: RouteContext): Promise<string> => {
  const { id } = await context.params;
  const value = String(id || "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new Error("Invalid project ID.");
  }

  return value;
};

const authorize = async (request: Request, id: string) => {
  const result = await db.query(
    `
    SELECT edit_token_hash
    FROM lca_projects
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  if (!result.rows.length) {
    return { ok: false as const, status: 404, error: "Project not found." };
  }

  const token = readProjectToken(request);

  if (!projectTokenMatches(token, String(result.rows[0].edit_token_hash || ""))) {
    return {
      ok: false as const,
      status: 403,
      error: "Project key is missing or invalid.",
    };
  }

  return { ok: true as const };
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const id = await projectId(context);
    const auth = await authorize(request, id);

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const result = await db.query(
      `
      SELECT
        id,
        name,
        schema_version AS "schemaVersion",
        app_version AS "appVersion",
        calculation_engine_version AS "calculationEngineVersion",
        study_period_years AS "studyPeriodYears",
        floor_area_m2 AS "floorAreaM2",
        annual_energy_kwh AS "annualEnergyKwh",
        grid_intensity AS "gridIntensity",
        baseline_rows AS "baselineRows",
        proposed_rows AS "proposedRows",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM lca_projects
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    return NextResponse.json(
      { success: true, project: result.rows[0] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load project.",
      },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const originError = rejectCrossOriginWrite(request);
  if (originError) return originError;

  const sizeError = jsonSizeGuard(request);
  if (sizeError) return sizeError;

  try {
    const id = await projectId(context);
    const auth = await authorize(request, id);

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const input = sanitizeProjectInput(await request.json());

    const result = await db.query(
      `
      UPDATE lca_projects
      SET
        name = $2,
        app_version = $3,
        calculation_engine_version = $4,
        study_period_years = $5,
        floor_area_m2 = $6,
        annual_energy_kwh = $7,
        grid_intensity = $8,
        baseline_rows = $9::jsonb,
        proposed_rows = $10::jsonb,
        metadata = $11::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        schema_version AS "schemaVersion",
        app_version AS "appVersion",
        calculation_engine_version AS "calculationEngineVersion",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [
        id,
        input.name,
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
      { success: true, project: result.rows[0] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("LCA project update error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update project.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const originError = rejectCrossOriginWrite(request);
  if (originError) return originError;

  try {
    const id = await projectId(context);
    const auth = await authorize(request, id);

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    await db.query(`DELETE FROM lca_projects WHERE id = $1`, [id]);

    return NextResponse.json(
      { success: true, deleted: id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("LCA project delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete project.",
      },
      { status: 400 }
    );
  }
}
