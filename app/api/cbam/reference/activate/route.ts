import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { readJsonWithLimit } from "@/lib/cbam-api-guard";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const authorised=(request:Request)=>{const secret=process.env.CBAM_CRON_SECRET||process.env.CRON_SECRET;return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`)};

export async function POST(request:Request){
  if(!authorised(request))return NextResponse.json({success:false,error:"Unauthorized."},{status:401});
  if(!process.env.DATABASE_URL)return NextResponse.json({success:false,error:"DATABASE_URL is not configured."},{status:500});
  try{
    const body=await readJsonWithLimit<{datasetType:string;sourceVersion:string}>(request,32_000);
    const type=String(body.datasetType||"");const version=String(body.sourceVersion||"");
    if(!["default_values","benchmarks","electricity_defaults"].includes(type)||!version)return NextResponse.json({success:false,error:"Valid datasetType and sourceVersion are required."},{status:400});
    const sql=neon(process.env.DATABASE_URL);
    const rows=await sql`SELECT * FROM cbam_reference_datasets WHERE dataset_type=${type} AND source_version=${version} ORDER BY discovered_at DESC LIMIT 1`;
    if(!rows.length)return NextResponse.json({success:false,error:"Dataset version was not found."},{status:404});
    const validation:any=rows[0].validation||{};
    if(validation.passed!==true && !(type==="electricity_defaults" && validation.electricityReady===true))return NextResponse.json({success:false,error:"Dataset has not passed the required validation controls.",validation},{status:422});
    // Manual activation is explicit administrative approval for staged data.
    await sql`UPDATE cbam_reference_datasets SET status='superseded' WHERE dataset_type=${type} AND status='active' AND source_version<>${version}`;
    await sql`UPDATE cbam_reference_datasets SET status='active',activated_at=NOW() WHERE dataset_type=${type} AND source_version=${version}`;
    await sql`INSERT INTO cbam_reference_active(dataset_type,source_version,sha256,updated_at) VALUES(${type},${version},${rows[0].sha256},NOW()) ON CONFLICT(dataset_type) DO UPDATE SET source_version=EXCLUDED.source_version,sha256=EXCLUDED.sha256,updated_at=NOW()`;
    return NextResponse.json({success:true,activated:{datasetType:type,sourceVersion:version,sha256:rows[0].sha256},warning:"Administrative activation confirms the staged dataset was reviewed. It does not itself certify the legal interpretation of a future changed regulation."},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:"Dataset activation failed."},{status:500})}
}
