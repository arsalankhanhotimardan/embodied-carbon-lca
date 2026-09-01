import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EC3_MATERIALS_URL = "https://buildingtransparency.org/api/materials";
const OPENEPD_API_BASE = "https://openepd.buildingtransparency.org/api";

type AnyObject = Record<string, any>;

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const measurementNumber = (value: any): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return null;

  const candidates = [
    value.value,
    value.mean,
    value.qty,
    value.amount,
    value.result,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const firstNumber = (...values: any[]): number | null => {
  for (const value of values) {
    const parsed =
      typeof value === "object" ? measurementNumber(value) : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const getPath = (obj: AnyObject, path: string): any =>
  path.split(".").reduce((acc: any, key) => acc?.[key], obj);

const measurementAt = (raw: AnyObject, paths: string[]): number | null => {
  for (const path of paths) {
    const value = getPath(raw, path);
    const parsed = measurementNumber(value);
    if (parsed !== null) return parsed;

    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

const impactSetFor = (raw: AnyObject, module: string) => {
  const moduleLower = module.toLowerCase();

  const impact = {
    gwp: measurementAt(raw, [
      `modules.${module}.gwp`,
      `modules.${moduleLower}.gwp`,
      `impacts.${module}.gwp`,
      `impacts.${moduleLower}.gwp`,
      `lca_modules.${module}.gwp`,
      `gwp_${moduleLower}`,
    ]),
    gwpFossil: measurementAt(raw, [
      `modules.${module}.gwpFossil`,
      `modules.${module}.gwp_fossil`,
      `impacts.${module}.gwp_fossil`,
      `gwp_fossil_${moduleLower}`,
    ]),
    gwpBiogenic: measurementAt(raw, [
      `modules.${module}.gwpBiogenic`,
      `modules.${module}.gwp_biogenic`,
      `impacts.${module}.gwp_biogenic`,
      `gwp_biogenic_${moduleLower}`,
    ]),
    gwpLuluc: measurementAt(raw, [
      `modules.${module}.gwpLuluc`,
      `modules.${module}.gwp_luluc`,
      `impacts.${module}.gwp_luluc`,
      `gwp_luluc_${moduleLower}`,
    ]),
    acidification: measurementAt(raw, [
      `modules.${module}.acidification`,
      `impacts.${module}.acidification`,
      `acidification_${moduleLower}`,
    ]),
    smog: measurementAt(raw, [
      `modules.${module}.smog`,
      `modules.${module}.pocp`,
      `impacts.${module}.smog`,
      `impacts.${module}.pocp`,
      `smog_${moduleLower}`,
    ]),
    eutrophication: measurementAt(raw, [
      `modules.${module}.eutrophication`,
      `impacts.${module}.eutrophication`,
      `eutrophication_${moduleLower}`,
    ]),
    ozone: measurementAt(raw, [
      `modules.${module}.ozone`,
      `modules.${module}.odp`,
      `impacts.${module}.ozone`,
      `impacts.${module}.odp`,
      `ozone_${moduleLower}`,
    ]),
    energy: measurementAt(raw, [
      `modules.${module}.energy`,
      `impacts.${module}.energy`,
      `energy_${moduleLower}`,
    ]),
  };

  return Object.fromEntries(
    Object.entries(impact).filter(([, value]) => value !== null)
  );
};

const stableFallbackId = (raw: AnyObject): string => {
  const identity = JSON.stringify({
    name: firstString(raw.product_name, raw.name, raw.material_name),
    manufacturer: firstString(raw.manufacturer?.name, raw.manufacturer_name),
    unit: firstString(
      raw.declared_unit?.unit,
      raw.declared_unit?.name,
      raw.declared_unit,
      raw.unit
    ),
  });

  return `ec3-search-${createHash("sha1")
    .update(identity)
    .digest("hex")
    .slice(0, 16)}`;
};

const mapEc3Result = (raw: AnyObject) => {
  const name =
    firstString(raw.product_name, raw.name, raw.material_name) ||
    "Unnamed EC3 result";

  const id =
    firstString(
      raw.epd?.id,
      raw.openepd?.id,
      raw.openepd_id,
      raw.epd_id,
      raw.uuid,
      raw.id
    ) || stableFallbackId(raw);

  const declaredUnit =
    firstString(
      raw.declared_unit?.unit,
      raw.declared_unit?.name,
      typeof raw.declared_unit === "string" ? raw.declared_unit : undefined,
      raw.unit
    ) || "unit";

  const declaredQuantity =
    firstNumber(
      raw.declared_unit?.qty,
      raw.declared_quantity,
      raw.reference_quantity
    ) ?? 1;

  const manufacturer = firstString(
    raw.manufacturer?.name,
    raw.manufacturer_name,
    raw.manufacturer
  );

  const category = firstString(
    raw.category?.display_name,
    raw.category?.name,
    raw.category,
    raw.product_classes?.["io.cqd.ec3"]
  );

  const modules: Record<string, any> = {};
  [
    "A1A3",
    "A4",
    "A5",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "B7",
    "C1",
    "C2",
    "C3",
    "C4",
    "D",
  ].forEach((module) => {
    const impact = impactSetFor(raw, module);
    if (Object.keys(impact).length) modules[module] = impact;
  });

  /**
   * EC3's material-search result commonly exposes the product GWP as
   * cradle-to-gate A1-A3. Preserve it ONLY as A1-A3 if a module-specific
   * value was not already returned. Never invent A4/A5/B/C/D values.
   */
  if (!modules.A1A3) {
    const gwp = firstNumber(
      raw.gwp,
      raw.gwp?.value,
      raw.gwp?.mean,
      raw.impacts?.gwp,
      raw.gwp_per_declared_unit
    );

    const acidification = firstNumber(
      raw.traci_acidification,
      raw.impacts?.acidification
    );
    const smog = firstNumber(raw.traci_smog, raw.impacts?.smog, raw.impacts?.pocp);
    const eutrophication = firstNumber(
      raw.traci_eutrophication,
      raw.impacts?.eutrophication
    );
    const ozone = firstNumber(raw.traci_ozone, raw.impacts?.ozone, raw.impacts?.odp);
    const energy = firstNumber(raw.traci_energy, raw.impacts?.energy);

    const a1a3 = Object.fromEntries(
      Object.entries({
        gwp,
        acidification,
        smog,
        eutrophication,
        ozone,
        energy,
      }).filter(([, value]) => value !== null)
    );

    if (Object.keys(a1a3).length) modules.A1A3 = a1a3;
  }

  const plant = Array.isArray(raw.plants)
    ? firstString(raw.plants[0]?.name, raw.plants[0]?.address)
    : firstString(raw.plant?.name, raw.plant, raw.facility);

  const geography = Array.isArray(raw.plants)
    ? firstString(raw.plants[0]?.address, raw.plants[0]?.jurisdiction)
    : firstString(raw.geography, raw.region, raw.jurisdiction);

  return {
    id,
    name,
    product_name: name,
    manufacturer,
    category,
    declared_unit: declaredUnit,
    declared_quantity: declaredQuantity,
    mass_kg_per_declared_unit:
      firstNumber(
        raw.kg_per_declared_unit,
        raw.mass_kg_per_declared_unit,
        raw.weight_kg_per_unit
      ) ?? undefined,
    density_kg_m3:
      firstNumber(raw.density_kg_m3, raw.density) ?? undefined,
    reference_service_life_years:
      firstNumber(
        raw.product_service_life_years,
        raw.reference_service_life_years,
        raw.rsl_years
      ) ?? undefined,
    geography,
    plant,
    pcr: firstString(raw.pcr?.name, raw.pcr?.short_name, raw.pcr),
    program_operator: firstString(
      raw.program_operator?.name,
      raw.program_operator
    ),
    valid_until: firstString(raw.valid_until, raw.expiry_date),
    modules,

    // Compatibility fields used by the older frontend.
    gwp: modules.A1A3?.gwp ?? null,
    traci_acidification: modules.A1A3?.acidification ?? null,
    traci_smog: modules.A1A3?.smog ?? null,

    /**
     * Keep the source record for audit/debugging. Your V2 adapter stores this
     * as metadata; calculations use normalized fields above.
     */
    metadata: {
      source: "Building Transparency EC3",
      raw,
    },
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get("search")?.trim();
  const epdId = searchParams.get("id")?.trim();

  if (!searchQuery && !epdId) {
    return NextResponse.json(
      { success: false, error: "Provide either search or id." },
      { status: 400 }
    );
  }

  const token = process.env.EC3_API_KEY || process.env.OPENEPD_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "EC3_API_KEY (or OPENEPD_API_TOKEN) is not configured.",
      },
      { status: 500 }
    );
  }

  try {
    /**
     * Detail mode: after the engineer selects a specific EC3/openEPD ID,
     * request the complete digital EPD object directly from openEPD.
     */
    if (epdId) {
      if (!/^[a-zA-Z0-9_-]{4,120}$/.test(epdId)) {
        return NextResponse.json(
          { success: false, error: "Invalid EPD id." },
          { status: 400 }
        );
      }

      const detailResponse = await fetch(
        `${OPENEPD_API_BASE}/epds/${encodeURIComponent(epdId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!detailResponse.ok) {
        const detail = await detailResponse.text();
        console.error(
          "openEPD detail rejection:",
          detailResponse.status,
          detail
        );

        return NextResponse.json(
          {
            success: false,
            error: `openEPD detail returned HTTP ${detailResponse.status}.`,
          },
          { status: 502 }
        );
      }

      const raw = await detailResponse.json();

      return NextResponse.json(
        {
          success: true,
          data: mapEc3Result(raw),
          provider: "Building Transparency openEPD",
          detail: true,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    /**
     * Search mode: preserve the EC3 material-search endpoint already working
     * in your existing application. The selected result can then be enriched
     * through detail mode above.
     */
    const url = new URL(EC3_MATERIALS_URL);
    url.searchParams.set("name__like", searchQuery!);
    url.searchParams.set("page_size", "20");

    const ec3Response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!ec3Response.ok) {
      const errorText = await ec3Response.text();
      console.error("EC3 rejection:", ec3Response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `EC3 returned HTTP ${ec3Response.status}.`,
        },
        { status: 502 }
      );
    }

    const payload = await ec3Response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data)
      ? payload.data
      : [];

    const mappedResults = rows.map(mapEc3Result);

    return NextResponse.json(
      {
        success: true,
        data: mappedResults,
        count: mappedResults.length,
        provider: "Building Transparency EC3",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("EC3/openEPD API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Building Transparency.",
      },
      { status: 500 }
    );
  }
}