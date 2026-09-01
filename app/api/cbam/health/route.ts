import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  if(!process.env.DATABASE_URL)return NextResponse.json({success:false,status:"down",checks:{database:false}},{status:503});
  try{
    const sql=neon(process.env.DATABASE_URL);
    const [active,prices]=await Promise.all([
      sql`SELECT dataset_type,source_version,updated_at FROM cbam_reference_active ORDER BY dataset_type`,
      sql`SELECT reporting_year,COUNT(*) FILTER(WHERE official=TRUE)::integer AS official_count,MAX(updated_at) AS latest_update FROM cbam_certificate_prices GROUP BY reporting_year ORDER BY reporting_year DESC LIMIT 5`,
    ]);
    const hasDefaults=active.some((r:any)=>r.dataset_type==="default_values");
    const hasBenchmarks=active.some((r:any)=>r.dataset_type==="benchmarks");
    const ok=hasDefaults&&hasBenchmarks;
    return NextResponse.json({success:ok,status:ok?"ok":"degraded",checks:{database:true,activeDefaultValues:hasDefaults,activeBenchmarks:hasBenchmarks,activeElectricityDefaults:active.some((r:any)=>r.dataset_type==="electricity_defaults")},activeReferenceDatasets:active,certificatePriceSummary:prices,checkedAt:new Date().toISOString()},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({success:false,status:"down",error:error instanceof Error?error.message:"Health check failed."},{status:503})}
}
