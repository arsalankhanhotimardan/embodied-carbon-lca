import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  isEc3PersistenceAllowed,
  jsonSizeGuard,
  rejectCrossOriginWrite,
} from "@/lib/lca-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EpdPayload = {
  id?: string;
  material_name?: string;
  aliases?: string[];
  manufacturer?: string | null;
  category?: string | null;
  source?: string | null;
  declared_unit?: string | null;
  declared_quantity?: number | null;
  mass_kg_per_declared_unit?: number | null;
  density_kg_m3?: number | null;
  lifespan_years?: number | null;
  geography?: string | null;
  plant?: string | null;
  pcr?: string | null;
  program_operator?: string | null;
  valid_until?: string | null;
  modules?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

const cleanAliases = (value: unknown, name: string): string[] => {
  const source = Array.isArray(value) ? value : [];
  return Array.from(
    new Set(
      [name, ...source]
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 100);
};

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const moduleMetric = (
  modules: Record<string, any> | null | undefined,
  module: string,
  metric: string
): number | null => finiteOrNull(modules?.[module]?.[metric]);

export async function GET() {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(m.external_id, 'legacy-' || m.id::text) AS id,
        m.id AS internal_db_id,
        m.material_name,
        COALESCE(m.aliases, '[]'::jsonb) AS aliases,
        m.manufacturer,
        m.category,
        COALESCE(m.source, 'Legacy') AS source,
        COALESCE(m.declared_unit, 'unit') AS declared_unit,
        COALESCE(m.declared_quantity, 1) AS declared_quantity,
        m.mass_kg_per_declared_unit,
        m.density_kg_m3,
        m.lifespan_years,
        m.geography,
        m.plant,
        m.pcr,
        m.program_operator,
        m.valid_until,
        COALESCE(m.modules, '{}'::jsonb) AS modules,
        COALESCE(m.metadata, '{}'::jsonb) AS metadata,

        -- Existing/legacy compatibility fields:
        m.weight_kg_per_unit,
        m.gwp_mfg,
        m.gwp_con,
        m.gwp_use,
        m.gwp_eol,
        m.gwp_biogenic,
        m.traci_acidification,
        m.traci_smog,
        m.traci_eutrophication,
        m.traci_ozone,
        m.traci_energy,

        alt.material_name AS alt_name,
        alt.gwp_mfg AS alt_gwp_mfg,
        alt.gwp_con AS alt_gwp_con,
        alt.gwp_use AS alt_gwp_use,
        alt.gwp_eol AS alt_gwp_eol,
        alt.gwp_biogenic AS alt_gwp_biogenic
      FROM epd_materials m
      LEFT JOIN epd_materials alt ON m.optimized_alt_id = alt.id
      ORDER BY m.material_name ASC
    `);

    return NextResponse.json(
      { success: true, data: result.rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("EPD GET database error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch EPD database." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const originError = rejectCrossOriginWrite(request);
  if (originError) return originError;

  const sizeError = jsonSizeGuard(request);
  if (sizeError) return sizeError;

  try {
    const body = await request.json();
    const materials: EpdPayload[] = Array.isArray(body?.newMaterials)
      ? body.newMaterials
      : [];

    if (!materials.length) {
      return NextResponse.json(
        { success: false, error: "newMaterials must contain at least one EPD." },
        { status: 400 }
      );
    }

    if (materials.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 EPD records per request." },
        { status: 400 }
      );
    }

    const saved: string[] = [];

    for (const material of materials) {
      const externalId = String(material.id || "").trim();
      const materialName = String(material.material_name || "").trim();

      if (!externalId || !materialName) {
        return NextResponse.json(
          {
            success: false,
            error: "Each EPD requires id and material_name.",
          },
          { status: 400 }
        );
      }

      const source = String(material.source || "EPD").trim().slice(0, 50);

      /**
       * Building Transparency currently requires the appropriate API rights
       * before EC3 data is stored/cached in a production application.
       */
      if (source === "EC3" && !isEc3PersistenceAllowed()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "EC3 persistence is disabled. Set EC3_ALLOW_PERSISTENCE=true only when your Building Transparency agreement permits storage/caching.",
          },
          { status: 403 }
        );
      }

      const aliases = cleanAliases(material.aliases, materialName);
      const modules =
        material.modules && typeof material.modules === "object"
          ? material.modules
          : {};
      const metadata =
        material.metadata && typeof material.metadata === "object"
          ? material.metadata
          : {};

      // Populate legacy columns from the same module source for backwards compatibility.
      const gwpMfg = moduleMetric(modules, "A1A3", "gwp");
      const gwpCon = moduleMetric(modules, "A5", "gwp");
      const gwpUse = moduleMetric(modules, "B1", "gwp");
      const gwpEol = moduleMetric(modules, "C4", "gwp");
      const gwpBiogenic = moduleMetric(modules, "A1A3", "gwpBiogenic");
      const acidification = moduleMetric(modules, "A1A3", "acidification");
      const smog = moduleMetric(modules, "A1A3", "smog");
      const eutrophication = moduleMetric(modules, "A1A3", "eutrophication");
      const ozone = moduleMetric(modules, "A1A3", "ozone");
      const energy = moduleMetric(modules, "A1A3", "energy");

      await db.query(
        `
        INSERT INTO epd_materials (
          external_id,
          material_name,
          aliases,
          manufacturer,
          category,
          source,
          declared_unit,
          declared_quantity,
          mass_kg_per_declared_unit,
          density_kg_m3,
          lifespan_years,
          geography,
          plant,
          pcr,
          program_operator,
          valid_until,
          modules,
          metadata,
          weight_kg_per_unit,
          gwp_mfg,
          gwp_con,
          gwp_use,
          gwp_eol,
          gwp_biogenic,
          traci_acidification,
          traci_smog,
          traci_eutrophication,
          traci_ozone,
          traci_energy,
          updated_at
        )
        VALUES (
          $1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17::jsonb,$18::jsonb,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW()
        )
        ON CONFLICT (external_id)
        DO UPDATE SET
          material_name = EXCLUDED.material_name,
          aliases = (
            SELECT COALESCE(jsonb_agg(DISTINCT alias_value), '[]'::jsonb)
            FROM jsonb_array_elements_text(
              COALESCE(epd_materials.aliases, '[]'::jsonb)
              || COALESCE(EXCLUDED.aliases, '[]'::jsonb)
            ) AS merged(alias_value)
          ),
          manufacturer = COALESCE(EXCLUDED.manufacturer, epd_materials.manufacturer),
          category = COALESCE(EXCLUDED.category, epd_materials.category),
          source = EXCLUDED.source,
          declared_unit = COALESCE(EXCLUDED.declared_unit, epd_materials.declared_unit),
          declared_quantity = COALESCE(EXCLUDED.declared_quantity, epd_materials.declared_quantity),
          mass_kg_per_declared_unit = COALESCE(EXCLUDED.mass_kg_per_declared_unit, epd_materials.mass_kg_per_declared_unit),
          density_kg_m3 = COALESCE(EXCLUDED.density_kg_m3, epd_materials.density_kg_m3),
          lifespan_years = COALESCE(EXCLUDED.lifespan_years, epd_materials.lifespan_years),
          geography = COALESCE(EXCLUDED.geography, epd_materials.geography),
          plant = COALESCE(EXCLUDED.plant, epd_materials.plant),
          pcr = COALESCE(EXCLUDED.pcr, epd_materials.pcr),
          program_operator = COALESCE(EXCLUDED.program_operator, epd_materials.program_operator),
          valid_until = COALESCE(EXCLUDED.valid_until, epd_materials.valid_until),
          modules = COALESCE(EXCLUDED.modules, epd_materials.modules),
          metadata = COALESCE(EXCLUDED.metadata, epd_materials.metadata),
          weight_kg_per_unit = COALESCE(EXCLUDED.weight_kg_per_unit, epd_materials.weight_kg_per_unit),
          gwp_mfg = COALESCE(EXCLUDED.gwp_mfg, epd_materials.gwp_mfg),
          gwp_con = COALESCE(EXCLUDED.gwp_con, epd_materials.gwp_con),
          gwp_use = COALESCE(EXCLUDED.gwp_use, epd_materials.gwp_use),
          gwp_eol = COALESCE(EXCLUDED.gwp_eol, epd_materials.gwp_eol),
          gwp_biogenic = COALESCE(EXCLUDED.gwp_biogenic, epd_materials.gwp_biogenic),
          traci_acidification = COALESCE(EXCLUDED.traci_acidification, epd_materials.traci_acidification),
          traci_smog = COALESCE(EXCLUDED.traci_smog, epd_materials.traci_smog),
          traci_eutrophication = COALESCE(EXCLUDED.traci_eutrophication, epd_materials.traci_eutrophication),
          traci_ozone = COALESCE(EXCLUDED.traci_ozone, epd_materials.traci_ozone),
          traci_energy = COALESCE(EXCLUDED.traci_energy, epd_materials.traci_energy),
          updated_at = NOW()
        `,
        [
          externalId,
          materialName,
          JSON.stringify(aliases),
          material.manufacturer || null,
          material.category || null,
          source,
          material.declared_unit || "unit",
          finiteOrNull(material.declared_quantity) ?? 1,
          finiteOrNull(material.mass_kg_per_declared_unit),
          finiteOrNull(material.density_kg_m3),
          finiteOrNull(material.lifespan_years),
          material.geography || null,
          material.plant || null,
          material.pcr || null,
          material.program_operator || null,
          material.valid_until || null,
          JSON.stringify(modules),
          JSON.stringify(metadata),
          finiteOrNull(material.mass_kg_per_declared_unit),
          gwpMfg,
          gwpCon,
          gwpUse,
          gwpEol,
          gwpBiogenic,
          acidification,
          smog,
          eutrophication,
          ozone,
          energy,
        ]
      );

      saved.push(externalId);
    }

    return NextResponse.json({
      success: true,
      saved,
      count: saved.length,
    });
  } catch (error) {
    console.error("EPD POST database error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to persist EPD data." },
      { status: 500 }
    );
  }
}