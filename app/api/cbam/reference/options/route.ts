import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { boundedText, enforcePublicApiGuard } from "@/lib/cbam-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeCountry = (value: string) =>
  value.toLowerCase().replace(/[–—]/g, "-").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function GET(request: Request) {
  try {
    const guard = await enforcePublicApiGuard(request, "reference-options", {
      limit: 120,
      windowSeconds: 300,
    });
    if (!guard.allowed) {
      return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429, headers: guard.headers });
    }
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
    const sql = neon(process.env.DATABASE_URL);
    const activeRows = await sql`SELECT source_version FROM cbam_reference_active WHERE dataset_type='default_values' LIMIT 1`;
    const version = activeRows[0]?.source_version ? String(activeRows[0].source_version) : "EU-default-values-corrected-2026-08-10";

    const url = new URL(request.url);
    const country = boundedText(url.searchParams.get("country"), 120);
    const search = boundedText(url.searchParams.get("search"), 120);
    const numericSearch = search.replace(/\D/g, "");

    if (!country) {
      const rows = await sql`
        SELECT country, country_normalized
        FROM cbam_official_default_values
        WHERE source_version=${version}
        GROUP BY country, country_normalized
        ORDER BY country ASC
      `;
      return NextResponse.json(
        { success: true, mode: "countries", sourceVersion: version, count: rows.length, countries: rows.map((r:any)=>({name:String(r.country),normalized:String(r.country_normalized)})) },
        { headers: { ...guard.headers, "Cache-Control": "public, max-age=3600, s-maxage=3600" } }
      );
    }

    const countryNormalized = normalizeCountry(country);
    let rows;
    if (!search) {
      rows = await sql`
        SELECT id,country,sector,cn_code,cn_digits,cn_digits_length,description,direct_emissions,indirect_emissions,total_emissions,production_route_indicator,production_route_label,source_regulation,source_version
        FROM cbam_official_default_values
        WHERE source_version=${version} AND country_normalized=${countryNormalized}
        ORDER BY sector ASC NULLS LAST,cn_digits ASC,production_route_indicator ASC NULLS LAST
        LIMIT 500
      `;
    } else if (numericSearch) {
      rows = await sql`
        SELECT id,country,sector,cn_code,cn_digits,cn_digits_length,description,direct_emissions,indirect_emissions,total_emissions,production_route_indicator,production_route_label,source_regulation,source_version
        FROM cbam_official_default_values
        WHERE source_version=${version} AND country_normalized=${countryNormalized}
          AND (cn_digits ILIKE ${`%${numericSearch}%`} OR cn_code ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`} OR sector ILIKE ${`%${search}%`})
        ORDER BY CASE WHEN cn_digits=${numericSearch} THEN 0 WHEN cn_digits LIKE ${numericSearch+"%"} THEN 1 ELSE 2 END, sector ASC NULLS LAST,cn_digits ASC
        LIMIT 500
      `;
    } else {
      rows = await sql`
        SELECT id,country,sector,cn_code,cn_digits,cn_digits_length,description,direct_emissions,indirect_emissions,total_emissions,production_route_indicator,production_route_label,source_regulation,source_version
        FROM cbam_official_default_values
        WHERE source_version=${version} AND country_normalized=${countryNormalized}
          AND (cn_code ILIKE ${`%${search}%`} OR description ILIKE ${`%${search}%`} OR sector ILIKE ${`%${search}%`})
        ORDER BY CASE WHEN sector ILIKE ${search} THEN 0 WHEN description ILIKE ${search} THEN 1 ELSE 2 END, sector ASC NULLS LAST,cn_digits ASC
        LIMIT 500
      `;
    }

    return NextResponse.json({
      success:true,mode:"goods",sourceVersion:version,country,countryNormalized,search:search||null,count:rows.length,
      goods:rows.map((row:any)=>({
        id:String(row.id),country:String(row.country),sector:row.sector?String(row.sector):null,
        cnCode:String(row.cn_code),cnDigits:String(row.cn_digits),cnDigitsLength:Number(row.cn_digits_length),description:row.description?String(row.description):null,
        rawDefault:{direct:row.direct_emissions===null?null:Number(row.direct_emissions),indirect:row.indirect_emissions===null?null:Number(row.indirect_emissions),total:row.total_emissions===null?null:Number(row.total_emissions)},
        productionRouteIndicator:row.production_route_indicator?String(row.production_route_indicator):null,
        productionRouteLabel:row.production_route_label?String(row.production_route_label):null,
        sourceRegulation:String(row.source_regulation),sourceVersion:String(row.source_version),
      }))
    },{headers:{...guard.headers,"Cache-Control":search?"no-store":"public, max-age=900, s-maxage=900"}});
  } catch (error) {
    console.error("CBAM reference options failed:",error);
    return NextResponse.json({success:false,error:error instanceof Error?error.message:"CBAM reference options failed."},{status:500});
  }
}
