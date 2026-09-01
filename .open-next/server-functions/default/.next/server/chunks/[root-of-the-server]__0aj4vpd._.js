module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},20635,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},59043,(e,t,r)=>{t.exports=e.x("next/dist/server/runtime-reacts.external.js",()=>require("next/dist/server/runtime-reacts.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81111,(e,t,r)=>{t.exports=e.x("node:stream",()=>require("node:stream"))},73632,e=>{"use strict";var t=e.i(66680),r=e.i(98323);function a(e,t=160){return(e??"").trim().slice(0,t)}async function i(e,a,s={}){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let n=Math.max(10,Math.trunc(s.limit??120)),o=Math.max(30,Math.trunc(s.windowSeconds??300)),l=process.env.CBAM_RATE_LIMIT_SALT||process.env.CBAM_CRON_SECRET||"cbam-public-rate-limit",c=`${a}|${e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||e.headers.get("x-real-ip")?.trim()||e.headers.get("cf-connecting-ip")?.trim()||"unknown"}`,u=t.default.createHash("sha256").update(`${l}|${c}`).digest("hex"),d=(0,r.neon)(process.env.DATABASE_URL),p=await d`
    INSERT INTO cbam_api_rate_limits (
      bucket_key,
      window_started_at,
      request_count,
      updated_at
    )
    VALUES (
      ${u},
      NOW(),
      1,
      NOW()
    )
    ON CONFLICT (bucket_key)
    DO UPDATE SET
      window_started_at = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${o} * INTERVAL '1 second')
          THEN NOW()
        ELSE cbam_api_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN NOW() - cbam_api_rate_limits.window_started_at >= (${o} * INTERVAL '1 second')
          THEN 1
        ELSE cbam_api_rate_limits.request_count + 1
      END,
      updated_at = NOW()
    RETURNING window_started_at, request_count
  `,m=Number(p[0]?.request_count||0),_=Math.max(1,Math.ceil((new Date(p[0]?.window_started_at||Date.now()).getTime()+1e3*o-Date.now())/1e3));return{allowed:m<=n,limit:n,count:m,retryAfter:_,headers:{"X-RateLimit-Limit":String(n),"X-RateLimit-Remaining":String(Math.max(0,n-m)),"Retry-After":String(_)}}}async function s(e,t=256e3){if(Number(e.headers.get("content-length")||0)>t)throw Error("Request body is too large.");let r=await e.text();if(Buffer.byteLength(r,"utf8")>t)throw Error("Request body is too large.");return JSON.parse(r)}e.s(["boundedNumber",0,function(e,t={}){let r=Number(e),a=t.fallback??0;return Number.isFinite(r)?void 0!==t.min&&r<t.min?t.min:void 0!==t.max&&r>t.max?t.max:r:a},"boundedText",0,a,"enforcePublicApiGuard",0,i,"normalizeCnInput",0,function(e){return a(e,24).replace(/\D/g,"")},"readJsonWithLimit",0,s])},93858,e=>{"use strict";var t=e.i(66680),r=e.i(98323);let a="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en",i="official_certificate_prices",s=e=>e.replace(/&nbsp;|&#160;/gi," ").replace(/&euro;|&#8364;/gi,"€").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&ndash;|&#8211;/gi,"–").replace(/&mdash;|&#8212;/gi,"—").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),n=e=>{for(let t of[...e].reverse())for(let e of[...t.matchAll(/(?:€\s*)?(\d{1,3})[,.](\d{2,6})\b/g)].reverse()){let t=Number(`${e[1]}.${e[2]}`);if(Number.isFinite(t)&&t>1&&t<1e3)return t}return null},o={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12},l=(e,t,r)=>`${e}-${String(t).padStart(2,"0")}-${String(r).padStart(2,"0")}`,c=e=>{let t=e.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);if(t)return l(Number(t[1]),Number(t[2]),Number(t[3]));let r=e.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);if(r)return l(Number(r[3]),Number(r[2]),Number(r[1]));let a=e.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);return a?l(Number(a[3]),o[a[2].toLowerCase()],Number(a[1])):null},u=e=>{let t=new Date(`${e}T00:00:00Z`),r=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-r);let a=t.getUTCFullYear(),i=new Date(Date.UTC(a,0,1));return{year:a,week:Math.ceil(((t.getTime()-i.getTime())/864e5+1)/7)}},d=(e,t)=>{let r=new Date(Date.UTC(e,0,4)),a=r.getUTCDay()||7,i=new Date(r);i.setUTCDate(r.getUTCDate()-a+1+(t-1)*7);let s=new Date(i);return s.setUTCDate(i.getUTCDate()+6),{start:i.toISOString().slice(0,10),end:s.toISOString().slice(0,10)}},p=(e,t)=>({Q1:[`${e}-01-01`,`${e}-03-31`],Q2:[`${e}-04-01`,`${e}-06-30`],Q3:[`${e}-07-01`,`${e}-09-30`],Q4:[`${e}-10-01`,`${e}-12-31`]})[t];async function m(e){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let o=(0,r.neon)(process.env.DATABASE_URL),l=!!e?.force,m=Math.max(1,e?.minIntervalHours??12),_=await o`
    SELECT
      last_attempt_at,
      last_success_at,
      last_error,
      last_items_saved
    FROM cbam_sync_state
    WHERE sync_key = ${i}
    LIMIT 1
  `,b=_[0]?.last_attempt_at?new Date(_[0].last_attempt_at).getTime():0,h=!b||Date.now()-b>=60*m*6e4;if(!l&&!h)return{success:!0,skipped:!0,reason:`Last automatic price-sync attempt was less than ${m} hours ago.`,saved:[]};await o`
    INSERT INTO cbam_sync_state (
      sync_key,
      last_attempt_at,
      updated_at
    )
    VALUES (
      ${i},
      NOW(),
      NOW()
    )
    ON CONFLICT (sync_key)
    DO UPDATE SET
      last_attempt_at = NOW(),
      updated_at = NOW()
  `;try{let e=await fetch(a,{headers:{"User-Agent":"GreenEngineeringTools-CBAM-PriceSync/2.0 (+https://greenengineeringtools.com)",Accept:"text/html"},cache:"no-store"});if(!e.ok)throw Error(`Commission certificate-price page returned HTTP ${e.status}.`);let r=await e.text(),l=t.default.createHash("sha256").update(r).digest("hex"),m=(e=>{let t=new Map;for(let r of(e=>{let t=[];for(let r of e.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){let e=[],a=/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;for(let t of r[1].matchAll(a))e.push(s(t[1]));e.some(Boolean)&&t.push(e)}return t})(e)){let e=r.join(" | "),a=n(r);if(null===a)continue;let i=e.match(/\b(Q[1-4])\s*(20\d{2})\b/i);if(i){let e=i[1].toUpperCase(),s=Number(i[2]);if(2026===s){let[i,n]=p(s,e),o={reportingYear:s,periodType:"quarterly",periodKey:`${s}-${e}`,quarter:e,weekNumber:null,periodStart:i,periodEnd:n,price:a,publishedAt:r.map(c).find(Boolean)??null};t.set(o.periodKey,o);continue}}let s=e.match(/\b(20\d{2})\s*[-/]?\s*W(?:EEK)?\s*0?(\d{1,2})\b/i)||e.match(/\bW(?:EEK)?\s*0?(\d{1,2})\s*[-/,]?\s*(20\d{2})\b/i)||e.match(/\bWEEK\s*0?(\d{1,2})\b[\s\S]*?\b(20\d{2})\b/i),o=null,l=null;if(s){let e=Number(s[1]),t=Number(s[2]);e>=2027?(o=e,l=t):(l=e,o=t)}let m=r.map(c).filter(e=>!!e);if((null===o||null===l)&&m.length){let e=u(m[0]);e.year>=2027&&(o=e.year,l=e.week)}if(null===o||null===l||o<2027||l<1||l>53)continue;let _=d(o,l),b=m.length>1?m[1]:m[0]??null,h={reportingYear:o,periodType:"weekly",periodKey:`${o}-W${String(l).padStart(2,"0")}`,quarter:null,weekNumber:l,periodStart:_.start,periodEnd:_.end,price:a,publishedAt:b};t.set(h.periodKey,h)}return[...t.values()].sort((e,t)=>e.periodKey.localeCompare(t.periodKey))})(r);if(!m.length)throw Error("No explicit official CBAM price rows could be parsed. Existing database prices were left unchanged.");let _=m.find(e=>"2026-Q1"===e.periodKey),b=m.find(e=>"2026-Q2"===e.periodKey);if(_&&Math.abs(_.price-75.36)>.001)throw Error(`Certificate-price parser control failed for 2026-Q1: ${_.price}.`);if(b&&Math.abs(b.price-75.28)>.001)throw Error(`Certificate-price parser control failed for 2026-Q2: ${b.price}.`);let h=[];for(let e of m){let t=await o`
        SELECT price_eur
        FROM cbam_certificate_prices
        WHERE period_key = ${e.periodKey}
        LIMIT 1
      `,r=t[0]?.price_eur===void 0?null:Number(t[0].price_eur),i=null===r?"insert":Math.abs(r-e.price)>1e-9?"correction":"refresh";await o`
        INSERT INTO cbam_certificate_price_history (
          period_key, previous_price_eur, new_price_eur, source_url, source_sha256, change_type
        ) VALUES (
          ${e.periodKey}, ${r}, ${e.price}, ${a}, ${l}, ${i}
        )
      `,await o`
        INSERT INTO cbam_certificate_prices (
          reporting_year,
          period_type,
          period_key,
          quarter,
          week_number,
          period_start,
          period_end,
          price_eur,
          official,
          published_at,
          source_url,
          updated_at
        )
        VALUES (
          ${e.reportingYear},
          ${e.periodType},
          ${e.periodKey},
          ${e.quarter},
          ${e.weekNumber},
          ${e.periodStart}::date,
          ${e.periodEnd}::date,
          ${e.price},
          TRUE,
          COALESCE(${e.publishedAt}::date, CURRENT_DATE)::timestamptz,
          ${a},
          NOW()
        )
        ON CONFLICT (period_key)
        DO UPDATE SET
          reporting_year = EXCLUDED.reporting_year,
          period_type = EXCLUDED.period_type,
          quarter = EXCLUDED.quarter,
          week_number = EXCLUDED.week_number,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          price_eur = EXCLUDED.price_eur,
          official = TRUE,
          published_at = EXCLUDED.published_at,
          source_url = EXCLUDED.source_url,
          updated_at = NOW()
      `,h.push({periodKey:e.periodKey,year:e.reportingYear,price:e.price,periodType:e.periodType})}return await o`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_success_at,
        last_error,
        last_items_saved,
        updated_at
      )
      VALUES (
        ${i},
        NOW(),
        NOW(),
        NULL,
        ${h.length},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_attempt_at = NOW(),
        last_success_at = NOW(),
        last_error = NULL,
        last_items_saved = ${h.length},
        updated_at = NOW()
    `,{success:!0,skipped:!1,source:a,sourceSha256:l,saved:h}}catch(t){let e=t instanceof Error?t.message:"Unknown CBAM price sync error.";throw await o`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_error,
        updated_at
      )
      VALUES (
        ${i},
        NOW(),
        ${e},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_error = ${e},
        updated_at = NOW()
    `,t}}e.s(["syncOfficialCbamPrices",0,m])},72354,e=>{"use strict";let t={2026:.975,2027:.95,2028:.9,2029:.775,2030:.515,2031:.39,2032:.265,2033:.14,2034:0},r={2026:1,2027:1,2028:1,2029:1,2030:1},a=new Set(["cement","iron_steel","aluminium","fertiliser"]),i=new Set(["iron_steel","aluminium","hydrogen","electricity"]);e.s(["assessAnnualMassThreshold",0,function(e){var t;let r=(t=e.sector,a.has(t)),i=Math.max(0,Number(e.priorYtdEligibleMassTonnes)||0),s=i+Math.max(0,Number(e.currentMassTonnes)||0);if(!r)return{eligible:!1,exempt:!1,priorYtdEligibleMassTonnes:i,annualEligibleMassAfterTonnes:s,crossedThresholdThisImport:!1,requiresYtdRecalculation:!1,reason:"This sector is not covered by the 50-tonne mass-based de-minimis threshold."};let n=s<=50,o=i<=50&&s>50;return{eligible:!0,exempt:n,priorYtdEligibleMassTonnes:i,annualEligibleMassAfterTonnes:s,crossedThresholdThisImport:o,requiresYtdRecalculation:o,reason:n?"Cumulative annual threshold-eligible mass does not exceed 50 tonnes.":o?"This import takes cumulative annual threshold-eligible mass above 50 tonnes; earlier relevant imports in the same calendar year must be included in the annual CBAM position.":"Cumulative annual threshold-eligible mass exceeds 50 tonnes."}},"cscfForYear",0,function(e){return e>=2034?null:r[e]??null},"effectiveRegulatoryYear",0,function(e){let t=Math.trunc(e.reportingYear),r=null===e.productionYear||void 0===e.productionYear?null:Math.trunc(e.productionYear);if(t<2026||t>2200)throw Error("Reporting year must be 2026 or later.");if(2026===t)return 2026;if(null===r)return t;if(r<2026)throw Error("A CBAM production year earlier than 2026 is not supported for definitive-period calculations.");if(r>t)throw Error("Production year cannot be later than the reporting/import year.");return r},"freeAllocationFactorForYear",0,function(e){return e>=2034?0:t[e]??null},"includedActualSpecificEmissions",0,function(e){let t=Math.max(0,e.processDirectPerTonne||0),r=Math.max(0,e.processIndirectPerTonne||0),a=i.has(e.sector);return{direct:t,indirectReported:r,indirectIncluded:a?0:r,totalIncluded:t+(a?0:r),directOnly:a}},"priceCadenceForYear",0,function(e){return 2026===e?"quarterly":"weekly"}])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0aj4vpd._.js.map