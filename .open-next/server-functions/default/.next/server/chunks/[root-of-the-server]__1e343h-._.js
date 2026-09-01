module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},20635,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},59043,(e,t,r)=>{t.exports=e.x("next/dist/server/runtime-reacts.external.js",()=>require("next/dist/server/runtime-reacts.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81111,(e,t,r)=>{t.exports=e.x("node:stream",()=>require("node:stream"))},73632,e=>{"use strict";var t=e.i(66680),r=e.i(98323);function n(e,t=160){return(e??"").trim().slice(0,t)}async function i(e,n,o={}){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let a=Math.max(10,Math.trunc(o.limit??120)),s=Math.max(30,Math.trunc(o.windowSeconds??300)),l=process.env.CBAM_RATE_LIMIT_SALT||process.env.CBAM_CRON_SECRET||"cbam-public-rate-limit",u=`${n}|${e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||e.headers.get("x-real-ip")?.trim()||e.headers.get("cf-connecting-ip")?.trim()||"unknown"}`,c=t.default.createHash("sha256").update(`${l}|${u}`).digest("hex"),d=(0,r.neon)(process.env.DATABASE_URL),m=await d`
    INSERT INTO cbam_api_rate_limits (
      bucket_key,
      window_started_at,
      request_count,
      updated_at
    )
    VALUES (
      ${c},
      NOW(),
      1,
      NOW()
    )
    ON CONFLICT (bucket_key)
    DO UPDATE SET
      window_started_at = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${s} * INTERVAL '1 second')
          THEN NOW()
        ELSE cbam_api_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${s} * INTERVAL '1 second')
          THEN 1
        ELSE cbam_api_rate_limits.request_count + 1
      END,
      updated_at = NOW()
    RETURNING window_started_at, request_count
  `,p=Number(m[0]?.request_count||0),_=Math.max(1,Math.ceil((new Date(m[0]?.window_started_at||Date.now()).getTime()+1e3*s-Date.now())/1e3));return{allowed:p<=a,limit:a,count:p,retryAfter:_,headers:{"X-RateLimit-Limit":String(a),"X-RateLimit-Remaining":String(Math.max(0,a-p)),"Retry-After":String(_)}}}async function o(e,t=256e3){if(Number(e.headers.get("content-length")||0)>t)throw Error("Request body is too large.");let r=await e.text();if(Buffer.byteLength(r,"utf8")>t)throw Error("Request body is too large.");return JSON.parse(r)}e.s(["boundedNumber",0,function(e,t={}){let r=Number(e),n=t.fallback??0;return Number.isFinite(r)?void 0!==t.min&&r<t.min?t.min:void 0!==t.max&&r>t.max?t.max:r:n},"boundedText",0,n,"enforcePublicApiGuard",0,i,"normalizeCnInput",0,function(e){return n(e,24).replace(/\D/g,"")},"readJsonWithLimit",0,o])},90602,e=>{"use strict";var t=e.i(98323),r=e.i(72354);let n={A:"grey clinker / cement",B:"white clinker / cement",C:"Carbon Steel based on BF/BOF",D:"Carbon Steel based on DRI/EAF",E:"Carbon Steel based on Scrap/EAF",F:"Low alloy Steel based on BF/BOF",G:"Low alloy Steel based on DRI/EAF",H:"Low alloy Steel based on Scrap/EAF",J:"High alloy Steel based on EAF",K:"primary Aluminium",L:"secondary Aluminium"};async function i(e){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let i=(0,t.neon)(process.env.DATABASE_URL),o=async(e,t)=>{let r=await i`
      SELECT source_version
      FROM cbam_reference_active
      WHERE dataset_type = ${e}
      LIMIT 1
    `;return r[0]?.source_version?String(r[0].source_version):t},a=await o("default_values","EU-default-values-corrected-2026-08-10"),s=await o("benchmarks","EU-benchmarks-2026-02-13"),l=e.reportingYear??e.year??2026,u=(0,r.effectiveRegulatoryYear)({reportingYear:l,productionYear:e.productionYear??null}),c=e.mode??"default",d=e.cnCode.replace(/\D/g,""),m=e.country.toLowerCase().replace(/[–—]/g,"-").replace(/[’']/g,"").replace(/[^a-z0-9]+/g," ").trim();if(d.length<4)throw Error("A valid CN/HS/TARIC code is required.");if(!m)throw Error("Country of origin is required.");let p=async e=>i`
      SELECT *
      FROM cbam_official_default_values
      WHERE source_version = ${a}
        AND country_normalized = ${e}
        AND (
          cn_digits = ${d}
          OR ${d} LIKE cn_digits || '%'
          OR cn_digits LIKE ${d} || '%'
        )
      ORDER BY
        CASE
          WHEN cn_digits = ${d} THEN 0
          WHEN ${d} LIKE cn_digits || '%' THEN 1
          WHEN cn_digits LIKE ${d} || '%' THEN 2
          ELSE 3
        END ASC,
        ABS(cn_digits_length - ${d.length}) ASC,
        cn_digits_length DESC,
        source_row ASC
      LIMIT 100
    `,_=await p(m),h=await p("other countries and territories"),g=e=>({cnCode:e.cn_code,cnDigits:e.cn_digits,description:e.description,sector:e.sector,totalEmissions:null===e.total_emissions?null:Number(e.total_emissions),productionRouteIndicator:e.production_route_indicator??null,productionRouteLabel:e.production_route_label??null,country:e.country}),f=e=>{if(!e.length)return{row:null,matchType:null,ambiguous:!1,candidates:[]};let t=e.filter(e=>String(e.cn_digits)===d);if(t.length)return{row:t.find(e=>null!==e.total_emissions)??t[0],matchType:"exact",ambiguous:!1,candidates:t};let r=e.filter(e=>{let t=String(e.cn_digits);return t.length<d.length&&d.startsWith(t)});if(r.length){let e=Math.max(...r.map(e=>Number(e.cn_digits_length))),t=r.filter(t=>Number(t.cn_digits_length)===e);return{row:t.find(e=>null!==e.total_emissions)??t[0],matchType:"parent",ambiguous:!1,candidates:t}}let n=e.filter(e=>{let t=String(e.cn_digits);return t.length>d.length&&t.startsWith(d)});if(n.length){let e=Math.min(...n.map(e=>Number(e.cn_digits_length))),t=n.filter(t=>Number(t.cn_digits_length)===e),r=t.filter(e=>null!==e.total_emissions),i=r.length>0?r:t;return new Set(i.map(e=>JSON.stringify({total:null===e.total_emissions?null:Number(e.total_emissions),route:e.production_route_indicator??null,sector:e.sector??null}))).size>1?{row:null,matchType:"child",ambiguous:!0,candidates:i}:{row:i[0],matchType:"child",ambiguous:!1,candidates:i}}return{row:null,matchType:null,ambiguous:!1,candidates:[]}},b=f(_),E=!1;if(b.ambiguous)return{found:!1,ambiguous:!0,reason:"This CN code maps to multiple more-specific official TARIC/CN default-value rows. Provide the more-specific code instead of allowing the calculator to guess.",cnCode:e.cnCode,normalizedCn:d,country:e.country,reportingYear:l,productionYear:e.productionYear??null,regulatoryYear:u,mode:c,candidates:b.candidates.map(g)};if(!b.row||null===b.row.total_emissions){let t=f(h);if(t.ambiguous)return{found:!1,ambiguous:!0,reason:'The "Other countries and territories" fallback contains multiple more-specific official rows for this code. Provide the more-specific CN/TARIC code.',cnCode:e.cnCode,normalizedCn:d,country:e.country,reportingYear:l,productionYear:e.productionYear??null,regulatoryYear:u,mode:c,candidates:t.candidates.map(g)};t.row&&(b=t,E=!0)}let N=b.row;if(!N)return{found:!1,ambiguous:!1,reason:"No official default-value record matched this CN/TARIC code and country.",cnCode:e.cnCode,normalizedCn:d,country:e.country,reportingYear:l,productionYear:e.productionYear??null,regulatoryYear:u,mode:c};let y=N.sector,x=N.production_route_indicator??null,A=e.productionRouteIndicator?.toUpperCase()||null,w="default"===c?x:A||x,S="default"===c?"default":"actual",v=await i`
    SELECT *
    FROM cbam_official_benchmarks
    WHERE source_version = ${s}
      AND benchmark_kind = ${S}
      AND (
        cn_digits = ${d}
        OR ${d} LIKE cn_digits || '%'
        OR cn_digits LIKE ${d} || '%'
      )
      AND production_year_from <= ${u}
      AND production_year_to >= ${u}
      AND (
        ${w}::text IS NULL
        OR production_route_indicator IS NULL
        OR production_route_indicator = ${w}
      )
    ORDER BY
      CASE
        WHEN cn_digits = ${d} THEN 0
        WHEN ${d} LIKE cn_digits || '%' THEN 1
        WHEN cn_digits LIKE ${d} || '%' THEN 2
        ELSE 3
      END ASC,
      ABS(cn_digits_length - ${d.length}) ASC,
      CASE
        WHEN production_route_indicator = ${w} THEN 0
        WHEN production_route_indicator IS NULL THEN 1
        ELSE 2
      END ASC,
      benchmark_value DESC
    LIMIT 30
  `,C=null,T=!1,R=[];if(v.length){let e=e=>{let t=String(e.cn_digits);return t===d?0:d.startsWith(t)?1:t.startsWith(d)?2:3},t=Math.min(...v.map(e)),r=v.filter(r=>e(r)===t),n=Math.min(...r.map(e=>Math.abs(Number(e.cn_digits_length)-d.length))),i=r.filter(e=>Math.abs(Number(e.cn_digits_length)-d.length)===n),o=i.filter(e=>null!==e.production_route_indicator);if(R=Array.from(new Set(o.map(e=>String(e.production_route_indicator)))).sort(),w){let e=i.filter(e=>e.production_route_indicator===w).sort((e,t)=>Number(t.benchmark_value)-Number(e.benchmark_value)),t=i.filter(e=>null===e.production_route_indicator).sort((e,t)=>Number(t.benchmark_value)-Number(e.benchmark_value));C=e[0]??t[0]??null}else{let e=i.filter(e=>null===e.production_route_indicator).sort((e,t)=>Number(t.benchmark_value)-Number(e.benchmark_value));e.length?C=e[0]:1===R.length?C=o.filter(e=>String(e.production_route_indicator)===R[0]).sort((e,t)=>Number(t.benchmark_value)-Number(e.benchmark_value))[0]??null:R.length>1&&(T=!0)}}let L=null===N.total_emissions?null:Number(N.total_emissions),k=((e,t)=>{if("fertiliser"===e)return 1.01;if("cement"===e||"iron_steel"===e||"aluminium"===e||"hydrogen"===e){if(2026===t)return 1.1;if(2027===t)return 1.2;if(t>=2028)return 1.3}return null})(y,u),I=C?.benchmark_value===void 0||C?.benchmark_value===null?null:Number(C.benchmark_value),M=(0,r.freeAllocationFactorForYear)(u),D=(0,r.cscfForYear)(u),$="default"!==c?null:0===M?0:null!==I&&null!==M&&null!==D?I*M*D:null;return{found:!0,cnCode:e.cnCode,normalizedCn:d,country:e.country,reportingYear:l,productionYear:e.productionYear??null,regulatoryYear:u,activeReferenceVersions:{defaultValues:a,benchmarks:s},mode:c,defaultValue:{countryUsed:N.country,fallbackUsed:E,cnMatchType:b.matchType,requestedCn:d,matchedCn:String(N.cn_digits),matchedCnCode:N.cn_code,sector:y,description:N.description,directEmissions:null===N.direct_emissions?null:Number(N.direct_emissions),indirectEmissions:null===N.indirect_emissions?null:Number(N.indirect_emissions),totalEmissions:L,markupMultiplier:k,markedUpTotalEmissions:null!==L&&null!==k?L*k:null,productionRouteIndicator:x,productionRouteLabel:x?n[x]??null:null,sourceRegulation:N.source_regulation,sourceVersion:N.source_version,sourceUrl:N.source_url},benchmark:C?{kind:S,value:I,productionRouteIndicator:C.production_route_indicator,productionRouteLabel:C.production_route_label,productionYearFrom:Number(C.production_year_from),productionYearTo:Number(C.production_year_to),sourceRegulation:C.source_regulation,sourceVersion:C.source_version,sourceUrl:C.source_url}:null,benchmarkResolution:{routeRequested:w,routeAmbiguous:T,routeCandidates:R},simpleDefaultSefa:$,warnings:[..."actual"===c?["Actual-data SEFA for complex goods can require process and precursor calculations; this endpoint only resolves the applicable process benchmark context."]:[],...T?[`Multiple production-route benchmarks are available (${R.join(", ")}). Select the applicable production route instead of allowing the calculator to guess.`]:[],...null===I&&0!==M?["No benchmark was resolved. Do not calculate a final free-allocation adjustment until the benchmark selection is reviewed."]:[],...u>2030&&0!==M?["CSCF is not hard-coded after 2030 in this resolver; future-year SEFA requires the applicable published CSCF."]:[]]}}e.s(["resolveOfficialCbamReference",0,i])},72354,e=>{"use strict";let t={2026:.975,2027:.95,2028:.9,2029:.775,2030:.515,2031:.39,2032:.265,2033:.14,2034:0},r={2026:1,2027:1,2028:1,2029:1,2030:1},n=new Set(["cement","iron_steel","aluminium","fertiliser"]),i=new Set(["iron_steel","aluminium","hydrogen","electricity"]);e.s(["assessAnnualMassThreshold",0,function(e){var t;let r=(t=e.sector,n.has(t)),i=Math.max(0,Number(e.priorYtdEligibleMassTonnes)||0),o=i+Math.max(0,Number(e.currentMassTonnes)||0);if(!r)return{eligible:!1,exempt:!1,priorYtdEligibleMassTonnes:i,annualEligibleMassAfterTonnes:o,crossedThresholdThisImport:!1,requiresYtdRecalculation:!1,reason:"This sector is not covered by the 50-tonne mass-based de-minimis threshold."};let a=o<=50,s=i<=50&&o>50;return{eligible:!0,exempt:a,priorYtdEligibleMassTonnes:i,annualEligibleMassAfterTonnes:o,crossedThresholdThisImport:s,requiresYtdRecalculation:s,reason:a?"Cumulative annual threshold-eligible mass does not exceed 50 tonnes.":s?"This import takes cumulative annual threshold-eligible mass above 50 tonnes; earlier relevant imports in the same calendar year must be included in the annual CBAM position.":"Cumulative annual threshold-eligible mass exceeds 50 tonnes."}},"cscfForYear",0,function(e){return e>=2034?null:r[e]??null},"effectiveRegulatoryYear",0,function(e){let t=Math.trunc(e.reportingYear),r=null===e.productionYear||void 0===e.productionYear?null:Math.trunc(e.productionYear);if(t<2026||t>2200)throw Error("Reporting year must be 2026 or later.");if(2026===t)return 2026;if(null===r)return t;if(r<2026)throw Error("A CBAM production year earlier than 2026 is not supported for definitive-period calculations.");if(r>t)throw Error("Production year cannot be later than the reporting/import year.");return r},"freeAllocationFactorForYear",0,function(e){return e>=2034?0:t[e]??null},"includedActualSpecificEmissions",0,function(e){let t=Math.max(0,e.processDirectPerTonne||0),r=Math.max(0,e.processIndirectPerTonne||0),n=i.has(e.sector);return{direct:t,indirectReported:r,indirectIncluded:n?0:r,totalIncluded:t+(n?0:r),directOnly:n}},"priceCadenceForYear",0,function(e){return 2026===e?"quarterly":"weekly"}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1e343h-._.js.map