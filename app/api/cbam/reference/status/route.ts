import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const authorised=(request:Request)=>{const secret=process.env.CBAM_CRON_SECRET||process.env.CRON_SECRET;return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`)};

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({success:false,error:"Unauthorized."},{status:401});
  if(!process.env.DATABASE_URL)return NextResponse.json({success:false,error:"DATABASE_URL is not configured."},{status:500});
  try{
    const sql=neon(process.env.DATABASE_URL);
    const [datasets,active,runs]=await Promise.all([
      sql`SELECT dataset_type,source_version,sha256,source_url,source_regulation,status,row_count,validation,discovered_at,activated_at FROM cbam_reference_datasets ORDER BY discovered_at DESC LIMIT 50`,
      sql`SELECT * FROM cbam_reference_active ORDER BY dataset_type`,
      sql`SELECT id,started_at,finished_at,status,discovered,validation,activated,error FROM cbam_reference_sync_runs ORDER BY id DESC LIMIT 20`,
    ]);
    return NextResponse.json({success:true,active,datasets,runs},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:"Reference status failed."},{status:500})}
}
