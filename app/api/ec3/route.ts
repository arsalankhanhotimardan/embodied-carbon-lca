import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EC3_MATERIALS_URL = "https://buildingtransparency.org/api/materials";
const OPENEPD_API_BASE = "https://openepd.buildingtransparency.org/api";

type AnyObject = Record<string, any>;

const isObject = (value: unknown): value is AnyObject =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

/**
 * Parse a numeric measurement without converting null/undefined to zero.
 * openEPD Measurement objects commonly use { mean, unit }.
 */
const measurementNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const direct = Number(value.trim());
    if (Number.isFinite(direct)) return direct;

    // Accept a quantity-like string only when it starts with a number.
    const match = value
      .trim()
      .match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(?:\s|$)/i);
    if (match) {
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  if (!isObject(value)) return null;

  const candidates = [
    value.mean,
    value.value,
    value.qty,
    value.amount,
    value.result,
  ];

  for (const candidate of candidates) {
    const parsed = measurementNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
};

const firstNumber = (...values: any[]): number | null => {
  for (const value of values) {
    const parsed = measurementNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const getPath = (obj: AnyObject, path: string): any =>
  path.split(".").reduce((acc: any, key) => acc?.[key], obj);

const measurementAt = (raw: AnyObject, paths: string[]): number | null => {
  for (const path of paths) {
    const parsed = measurementNumber(getPath(raw, path));
    if (parsed !== null) return parsed;
  }
  return null;
};

const moduleScopeAliases = (module: string): string[] => {
  if (module === "A1A3") {
    return ["A1A2A3", "A1A3", "A1-A3", "A1_A3", "A1/A3"];
  }
  return [module, module.toLowerCase()];
};

const scopesetValue = (
  scopeSet: AnyObject | null | undefined,
  module: string
): number | null => {
  if (!isObject(scopeSet)) return null;

  for (const key of moduleScopeAliases(module)) {
    const value = measurementNumber(scopeSet[key]);
    if (value !== null) return value;
  }

  // openEPD may expose A1, A2 and A3 independently.
  // Only aggregate them if ALL three are declared.
  if (module === "A1A3") {
    const split = ["A1", "A2", "A3"].map((key) =>
      measurementNumber(scopeSet[key] ?? scopeSet[key.toLowerCase()])
    );

    if (split.every((value) => value !== null)) {
      return (split as number[]).reduce((sum, value) => sum + value, 0);
    }
  }

  return null;
};

type SelectedImpactSet = {
  method: string;
  set: AnyObject;
} | null;

const impactIndicator = (
  set: AnyObject,
  aliases: string[]
): AnyObject | null => {
  for (const alias of aliases) {
    const candidate = set[alias];
    if (isObject(candidate)) return candidate;
  }
  return null;
};

const hasAnyScopeValue = (scopeSet: AnyObject | null): boolean => {
  if (!scopeSet) return false;
  return [
    "A1A2A3",
    "A1A3",
    "A1",
    "A2",
    "A3",
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
  ].some((key) => measurementNumber(scopeSet[key]) !== null);
};

/**
 * openEPD standard structure:
 * impacts -> LCIA method -> indicator -> scope -> Measurement
 *
 * Example from the openEPD model:
 * impacts["TRACI 2.1"].gwp.A1A2A3.mean
 *
 * Select ONE LCIA method for a record so impact categories are not silently
 * mixed across methods.
 */
const selectOpenEpdImpactSet = (raw: AnyObject): SelectedImpactSet => {
  if (!isObject(raw.impacts)) return null;

  const preferredMethods = [
    "TRACI 2.2",
    "TRACI 2.1",
    "TRACI 2.0",
    "IPCC AR6",
    "IPCC AR5",
    "EF 3.1",
    "EF 3.0",
    "CML 2016",
    "CML 2012",
    "EN 15978:2011",
  ];

  const candidates = Object.entries(raw.impacts)
    .filter(([, value]) => isObject(value))
    .map(([method, value]) => {
      const set = value as AnyObject;

      const gwp = impactIndicator(set, ["gwp"]);
      const ap = impactIndicator(set, ["ap", "acidification"]);
      const pocp = impactIndicator(set, ["pocp", "smog"]);
      const ep = impactIndicator(set, [
        "ep",
        "ep-marine",
        "ep_marine",
        "eutrophication",
      ]);
      const odp = impactIndicator(set, ["odp", "ozone"]);

      const score =
        (hasAnyScopeValue(gwp) ? 100 : 0) +
        (hasAnyScopeValue(ap) ? 10 : 0) +
        (hasAnyScopeValue(pocp) ? 10 : 0) +
        (hasAnyScopeValue(ep) ? 10 : 0) +
        (hasAnyScopeValue(odp) ? 10 : 0);

      const preferenceIndex = preferredMethods.findIndex(
        (candidate) => candidate.toLowerCase() === method.toLowerCase()
      );

      return {
        method,
        set,
        score,
        preferenceIndex: preferenceIndex === -1 ? 999 : preferenceIndex,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.preferenceIndex - b.preferenceIndex ||
        a.method.localeCompare(b.method)
    );

  return candidates.length
    ? { method: candidates[0].method, set: candidates[0].set }
    : null;
};

const openEpdMetric = (
  selected: SelectedImpactSet,
  module: string,
  aliases: string[]
): number | null => {
  if (!selected) return null;
  const scopeSet = impactIndicator(selected.set, aliases);
  return scopesetValue(scopeSet, module);
};

const openEpdPrimaryEnergy = (
  raw: AnyObject,
  module: string
): number | null => {
  if (!isObject(raw.resource_uses)) return null;

  const renewable =
    scopesetValue(raw.resource_uses.pert, module) ??
    scopesetValue(raw.resource_uses.PERT, module);

  const nonRenewable =
    scopesetValue(raw.resource_uses.penrt, module) ??
    scopesetValue(raw.resource_uses.PENRT, module);

  // Primary energy total is only reported if both totals are available.
  // Do not turn a partial resource-use declaration into a complete total.
  if (renewable !== null && nonRenewable !== null) {
    return renewable + nonRenewable;
  }

  return null;
};

const impactSetFor = (
  raw: AnyObject,
  module: string,
  selectedOpenEpd: SelectedImpactSet
) => {
  const moduleLower = module.toLowerCase();

  // 1) Existing normalized/legacy structures already used by this app.
  const legacy = {
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

  // 2) Real openEPD method-centric structure.
  const openEpd = {
    gwp: openEpdMetric(selectedOpenEpd, module, ["gwp"]),
    gwpFossil: openEpdMetric(selectedOpenEpd, module, [
      "gwp-fossil",
      "gwp_fossil",
      "gwpFossil",
    ]),
    gwpBiogenic: openEpdMetric(selectedOpenEpd, module, [
      "gwp-biogenic",
      "gwp_biogenic",
      "gwpBiogenic",
    ]),
    gwpLuluc: openEpdMetric(selectedOpenEpd, module, [
      "gwp-luluc",
      "gwp_luluc",
      "gwpLuluc",
    ]),
    acidification: openEpdMetric(selectedOpenEpd, module, [
      "ap",
      "acidification",
    ]),
    smog: openEpdMetric(selectedOpenEpd, module, ["pocp", "smog"]),
    eutrophication: openEpdMetric(selectedOpenEpd, module, [
      "ep",
      "ep-marine",
      "ep_marine",
      "eutrophication",
    ]),
    ozone: openEpdMetric(selectedOpenEpd, module, ["odp", "ozone"]),
    energy: openEpdPrimaryEnergy(raw, module),
  };

  const merged = {
    gwp: legacy.gwp ?? openEpd.gwp,
    gwpFossil: legacy.gwpFossil ?? openEpd.gwpFossil,
    gwpBiogenic: legacy.gwpBiogenic ?? openEpd.gwpBiogenic,
    gwpLuluc: legacy.gwpLuluc ?? openEpd.gwpLuluc,
    acidification: legacy.acidification ?? openEpd.acidification,
    smog: legacy.smog ?? openEpd.smog,
    eutrophication: legacy.eutrophication ?? openEpd.eutrophication,
    ozone: legacy.ozone ?? openEpd.ozone,
    energy: legacy.energy ?? openEpd.energy,
  };

  return Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== null)
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

  // openEPD's canonical identifier is commonly exposed as open_xpd_uuid.
  // Keep legacy/nested candidates for compatibility with EC3 material search.
  const openXpdId = firstString(
    raw.open_xpd_uuid,
    raw.openXpdUuid,
    raw.epd?.open_xpd_uuid,
    raw.openepd?.open_xpd_uuid,
    raw.epd?.id,
    raw.openepd?.id,
    raw.openepd_id,
    raw.epd_id,
    raw.uuid,
    raw.id
  );

  const id = openXpdId || stableFallbackId(raw);

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

  const selectedOpenEpd = selectOpenEpdImpactSet(raw);
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
    const impact = impactSetFor(raw, module, selectedOpenEpd);
    if (Object.keys(impact).length) modules[module] = impact;
  });

  /**
   * Some EC3 search results expose a single product GWP field rather than the
   * full openEPD impact structure. Use it ONLY as A1-A3 if A1-A3 GWP was not
   * already obtained. Never copy it into later lifecycle stages.
   */
  if (
    !modules.A1A3 ||
    typeof modules.A1A3.gwp !== "number" ||
    !Number.isFinite(modules.A1A3.gwp)
  ) {
    const gwp = firstNumber(
      raw.gwp,
      raw.gwp?.value,
      raw.gwp?.mean,
      raw.gwp_per_declared_unit
    );

    const acidification = firstNumber(raw.traci_acidification);
    const smog = firstNumber(raw.traci_smog);
    const eutrophication = firstNumber(raw.traci_eutrophication);
    const ozone = firstNumber(raw.traci_ozone);
    const energy = firstNumber(raw.traci_energy);

    const fallbackA1A3 = Object.fromEntries(
      Object.entries({
        gwp,
        acidification,
        smog,
        eutrophication,
        ozone,
        energy,
      }).filter(([, value]) => value !== null)
    );

    if (Object.keys(fallbackA1A3).length) {
      modules.A1A3 = {
        ...fallbackA1A3,
        ...(modules.A1A3 || {}),
      };
    }
  }

  const plant = Array.isArray(raw.plants)
    ? firstString(raw.plants[0]?.name, raw.plants[0]?.address)
    : firstString(raw.plant?.name, raw.plant, raw.facility);

  const geography = Array.isArray(raw.plants)
    ? firstString(raw.plants[0]?.address, raw.plants[0]?.jurisdiction)
    : firstString(raw.geography, raw.region, raw.jurisdiction);

  return {
    id,
    open_xpd_uuid: openXpdId,
    name,
    product_name: name,
    manufacturer,
    category,
    source: "EC3",
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

    // Compatibility fields used by the existing frontend.
    gwp: modules.A1A3?.gwp ?? null,
    traci_acidification: modules.A1A3?.acidification ?? null,
    traci_smog: modules.A1A3?.smog ?? null,

    metadata: {
      source: "Building Transparency EC3/openEPD",
      open_xpd_uuid: openXpdId,
      lcia_method: selectedOpenEpd?.method ?? null,
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
    if (epdId) {
      if (!/^[a-zA-Z0-9_-]{4,120}$/.test(epdId)) {
        return NextResponse.json(
          { success: false, error: "Invalid EPD id." },
          { status: 400 }
        );
      }

      if (epdId.startsWith("ec3-search-")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This EC3 search result does not expose a usable openEPD identifier for detail enrichment.",
          },
          { status: 422 }
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
      const mapped = mapEc3Result(raw);

      return NextResponse.json(
        {
          success: true,
          data: mapped,
          provider: "Building Transparency openEPD",
          detail: true,
          lciaMethod: mapped.metadata?.lcia_method ?? null,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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
