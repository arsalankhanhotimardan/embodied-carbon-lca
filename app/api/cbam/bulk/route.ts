import { NextResponse } from "next/server";
import { resolveOfficialCbamReference } from "@/lib/cbam-official-reference";
import { assessAnnualMassThreshold } from "@/lib/cbam-regulatory-calendar";
import { enforcePublicApiGuard, readJsonWithLimit } from "@/lib/cbam-api-guard";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Row={supplier?:string;country:string;cnCode:string;tonnes:number;reportingYear:number;productionYear?:number|null;certificatePriceEur:number;priorYtdEligibleMassTonnes?:number};

export async function POST(request:Request){
  try{
    const guard=await enforcePublicApiGuard(request,"bulk",{limit:20,windowSeconds:300});
    if(!guard.allowed) return NextResponse.json({success:false,error:"Too many bulk requests."},{status:429,headers:guard.headers});
    const body=await readJsonWithLimit<{rows:Row[]}>(request,1_500_000);
    if(!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>200) return NextResponse.json({success:false,error:"Bulk import requires 1-200 rows per request."},{status:400,headers:guard.headers});
    const results=[];
    for(let i=0;i<body.rows.length;i++){
      const row=body.rows[i];
      try{
        const ref=await resolveOfficialCbamReference({cnCode:String(row.cnCode||""),country:String(row.country||""),reportingYear:Number(row.reportingYear)||2026,productionYear:row.productionYear??null,mode:"default"});
        if(!ref.found){results.push({row:i+1,success:false,error:ref.reason,candidates:ref.candidates??[]});continue;}
        const ef=ref.defaultValue?.markedUpTotalEmissions;
        const sefa=ref.simpleDefaultSefa;
        const mass=Math.max(0,Number(row.tonnes)||0);
        const embedded=ef===null||ef===undefined?null:mass*ef;
        const faa=sefa===null?null:mass*Number(sefa);
        const cert=embedded===null||faa===null?null:Math.max(0,embedded-faa);
        const threshold=assessAnnualMassThreshold({sector:ref.defaultValue?.sector,priorYtdEligibleMassTonnes:Number(row.priorYtdEligibleMassTonnes)||0,currentMassTonnes:mass});
        const finalCert=threshold.exempt?0:cert;
        results.push({row:i+1,success:true,supplier:row.supplier??null,country:row.country,cnCode:row.cnCode,matchedCn:ref.defaultValue?.matchedCn,sector:ref.defaultValue?.sector,reportingYear:row.reportingYear,productionYear:row.productionYear??null,regulatoryYear:ref.regulatoryYear,tonnes:mass,ef,sefa,embeddedEmissionsTco2e:embedded,freeAllocationAdjustmentTco2e:faa,certificates:finalCert,estimatedExposureEur:finalCert===null?null:finalCert*Math.max(0,Number(row.certificatePriceEur)||0),threshold,sourceVersion:ref.defaultValue?.sourceVersion});
      }catch(error){results.push({row:i+1,success:false,error:error instanceof Error?error.message:"Row failed."});}
    }
    return NextResponse.json({success:true,count:results.length,successCount:results.filter((r:any)=>r.success).length,errorCount:results.filter((r:any)=>!r.success).length,results},{headers:{...guard.headers,"Cache-Control":"no-store"}});
  }catch(error){return NextResponse.json({success:false,error:error instanceof Error?error.message:"Bulk calculation failed."},{status:400});}
}
