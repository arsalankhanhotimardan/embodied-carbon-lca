#!/usr/bin/env node

const BASE_URL=(process.env.CBAM_TEST_BASE_URL||"http://localhost:3000").replace(/\/$/,"");
const tests=[];
const close=(a,b,t=1e-9)=>Math.abs(Number(a)-Number(b))<=t;
const add=(name,fn)=>tests.push({name,fn});

async function json(path,options={}){
  const res=await fetch(`${BASE_URL}${path}`,options);
  const text=await res.text();
  let body;try{body=JSON.parse(text)}catch{throw new Error(`Non-JSON response HTTP ${res.status}: ${text.slice(0,300)}`)}
  if(!res.ok)throw new Error(`HTTP ${res.status}: ${body.error||text.slice(0,300)}`);
  return body;
}
const post=(path,body)=>json(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});

add("health endpoint",async()=>{const r=await json("/api/cbam/health");if(!r.success)throw new Error("health not OK")});
add("dynamic years include 2026 and 2034",async()=>{const r=await json("/api/cbam/years");const ys=r.years.map(x=>x.year);if(!ys.includes(2026)||!ys.includes(2034))throw new Error(`years=${ys.join(",")}`);const y26=r.years.find(x=>x.year===2026);const y27=r.years.find(x=>x.year===2027);if(y26.priceCadence!=="quarterly"||y27.priceCadence!=="weekly")throw new Error("price cadence regression")});
add("country options include Türkiye",async()=>{const r=await json("/api/cbam/reference/options");if(!r.countries.some(x=>x.name==="Türkiye"))throw new Error("Türkiye missing")});
add("Türkiye numeric search 7208",async()=>{const r=await json("/api/cbam/reference/options?country="+encodeURIComponent("Türkiye")+"&search=7208");if(!r.goods.some(x=>String(x.cnDigits).startsWith("7208")))throw new Error("7208 result missing")});

add("Albania clinker 2026 known control",async()=>{
  const r=await json("/api/cbam/reference?cn=2523100090&country=Albania&reportingYear=2026&productionYear=2026&mode=default");
  const d=r.data;if(!d.found)throw new Error(d.reason||"not found");
  if(!close(d.defaultValue.totalEmissions,.87))throw new Error(`raw=${d.defaultValue.totalEmissions}`);
  if(!close(d.defaultValue.markedUpTotalEmissions,.957))throw new Error(`marked=${d.defaultValue.markedUpTotalEmissions}`);
  if(d.defaultValue.productionRouteIndicator!=="A")throw new Error(`route=${d.defaultValue.productionRouteIndicator}`);
  if(!close(d.benchmark.value,.666))throw new Error(`benchmark=${d.benchmark.value}`);
  if(!close(d.simpleDefaultSefa,.64935))throw new Error(`sefa=${d.simpleDefaultSefa}`);
});

add("Albania clinker 2027 markup and SEFA",async()=>{
  const r=await json("/api/cbam/reference?cn=2523100090&country=Albania&reportingYear=2027&productionYear=2027&mode=default");
  const d=r.data;if(!d.found)throw new Error(d.reason||"not found");
  if(!close(d.defaultValue.markedUpTotalEmissions,1.044))throw new Error(`marked=${d.defaultValue.markedUpTotalEmissions}`);
  if(!close(d.simpleDefaultSefa,.6327))throw new Error(`sefa=${d.simpleDefaultSefa}`);
});

add("2026 import ignores later production year",async()=>{
  const r=await json("/api/cbam/reference?cn=2523100090&country=Albania&reportingYear=2026&productionYear=2026&mode=default");
  if(r.data.regulatoryYear!==2026)throw new Error(`regulatoryYear=${r.data.regulatoryYear}`);
});

add("aluminous cement benchmark 2026-27 control",async()=>{
  const r=await json("/api/cbam/reference?cn=25233000&country="+encodeURIComponent("Türkiye")+"&reportingYear=2027&productionYear=2027&mode=default");
  if(!r.data.found||!close(r.data.benchmark.value,.717))throw new Error(`benchmark=${r.data?.benchmark?.value}`);
});
add("aluminous cement benchmark 2028-30 control",async()=>{
  const r=await json("/api/cbam/reference?cn=25233000&country="+encodeURIComponent("Türkiye")+"&reportingYear=2028&productionYear=2028&mode=default");
  if(!r.data.found||!close(r.data.benchmark.value,.686))throw new Error(`benchmark=${r.data?.benchmark?.value}`);
});

const defaultCalc=(tonnes,claim=false)=>post("/api/cbam/calculate",{kind:"default",cnCode:"2523100090",country:"Albania",reportingYear:2026,productionYear:2026,tonnes,certificatePriceEur:75.36,priorYtdEligibleMassTonnes:0,carbonPriceClaim:claim?{claimRequested:true,carbonPriceMode:"commission_default"}:{claimRequested:false}});
add("50.000 t remains within annual de-minimis threshold",async()=>{const r=await defaultCalc(50);if(!r.data.threshold.exempt||r.data.finalCertificatesAfterCarbonPrice!==0)throw new Error(JSON.stringify(r.data.threshold))});
add("50.001 t exceeds annual de-minimis threshold",async()=>{const r=await defaultCalc(50.001);if(r.data.threshold.exempt||!(r.data.finalCertificatesAfterCarbonPrice>0))throw new Error(JSON.stringify(r.data.threshold))});
add("Article 9 pending rule fails closed",async()=>{const r=await defaultCalc(60,true);if(!r.data.carbonPriceConversionPending||r.data.finalCertificatesAfterCarbonPrice!==null||r.data.finalEstimatedExposureEur!==null)throw new Error("carbon price claim did not fail closed")});

add("official bulk endpoint resolves Albania clinker",async()=>{const r=await post("/api/cbam/bulk",{rows:[{supplier:"Regression",country:"Albania",cnCode:"2523100090",tonnes:60,reportingYear:2026,productionYear:2026,certificatePriceEur:75.36,priorYtdEligibleMassTonnes:0}]});if(r.successCount!==1||!r.results[0].success||!close(r.results[0].ef,.957))throw new Error(JSON.stringify(r.results[0]))});

add("actual simple-good engine returns process benchmark context",async()=>{const r=await post("/api/cbam/calculate",{kind:"actual",reportingYear:2026,tonnes:60,certificatePriceEur:75.36,good:{cnCode:"7208",country:"Türkiye",productionYear:2026,productionRouteIndicator:"C",activityLevelTonnes:100,processDirectEmissionsTco2e:200,processIndirectEmissionsTco2e:0,verified:false,precursors:[]}});if(!r.data.actual||r.data.actual.benchmark===null)throw new Error("actual benchmark missing");if(r.data.actual.declarationReady)throw new Error("unverified input became declarationReady")});

add("electricity endpoint fails safely or resolves official Annex III",async()=>{
  const health=await json("/api/cbam/health");
  if(!health.checks.activeElectricityDefaults){
    const res=await fetch(`${BASE_URL}/api/cbam/calculate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"electricity",country:"Türkiye",reportingYear:2026,mwh:100,certificatePriceEur:75.36,mode:"default"})});
    const b=await res.json();if(res.ok||b.success!==false)throw new Error("electricity missing-data path did not fail closed");return;
  }
  const r=await post("/api/cbam/calculate",{kind:"electricity",country:"Türkiye",reportingYear:2026,mwh:100,certificatePriceEur:75.36,mode:"default"});if(!r.data||r.data.freeAllocationAdjustmentTco2e!==0||r.data.massThresholdApplies!==false)throw new Error("electricity methodology regression");
});

let passed=0;
for(const t of tests){
  try{await t.fn();passed++;console.log(`PASS  ${t.name}`)}catch(error){console.error(`FAIL  ${t.name}\n      ${error instanceof Error?error.message:String(error)}`)}
}
console.log(`\n${passed}/${tests.length} regression tests passed against ${BASE_URL}`);
if(passed!==tests.length)process.exit(1);
