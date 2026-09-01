module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},20635,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},59043,(e,t,r)=>{t.exports=e.x("next/dist/server/runtime-reacts.external.js",()=>require("next/dist/server/runtime-reacts.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81111,(e,t,r)=>{t.exports=e.x("node:stream",()=>require("node:stream"))},545,e=>{"use strict";var t=e.i(89171),r=e.i(93858);let a=async e=>{let a,s;if(a=process.env.CBAM_CRON_SECRET||process.env.CRON_SECRET,s=e.headers.get("authorization"),!a||s!==`Bearer ${a}`)return t.NextResponse.json({success:!1,error:"Unauthorized."},{status:401});try{let e=await (0,r.syncOfficialCbamPrices)({force:!0});return t.NextResponse.json(e)}catch(e){return console.error("CBAM price sync failed:",e),t.NextResponse.json({success:!1,error:e instanceof Error?e.message:"CBAM price sync failed."},{status:500})}};async function s(e){return a(e)}async function i(e){return a(e)}e.s(["GET",0,i,"POST",0,s,"dynamic",0,"force-dynamic","runtime",0,"nodejs"])},75979,e=>{"use strict";var t=e.i(47909),r=e.i(74017),a=e.i(96250),s=e.i(59756),i=e.i(61916),n=e.i(74677),o=e.i(69741),l=e.i(16795),c=e.i(87718),p=e.i(95169),u=e.i(47587),d=e.i(66012),m=e.i(70101),h=e.i(26937),_=e.i(10372),y=e.i(93695);e.i(52474);var f=e.i(220);let E=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/cbam/sync-prices/route",pathname:"/api/cbam/sync-prices",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/cbam/sync-prices/route.ts",nextConfigOutput:"standalone",userland:()=>e.r(545),...{}}),{workAsyncStorage:g,workUnitAsyncStorage:b,serverHooks:x}=E;async function C(e,t,a){a.requestMeta&&(0,s.setRequestMeta)(e,a.requestMeta),E.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let g="/api/cbam/sync-prices/route";g=g.replace(/\/index$/,"")||"/";let b=await E.prepare(e,t,{srcPage:g,multiZoneDraftMode:!1});if(!b)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,deploymentId:C,params:T,nextConfig:R,parsedUrl:v,isDraftMode:N,prerenderManifest:w,routerServerContext:A,isOnDemandRevalidate:S,revalidateOnlyGenerated:O,resolvedPathname:D,clientReferenceManifest:U,serverActionsManifest:$}=b,k=(0,o.normalizeAppPath)(g),L=!!(w.dynamicRoutes[k]||w.routes[D]),I=async()=>((null==A?void 0:A.render404)?await A.render404(e,t,v,!1):t.end("This page could not be found"),null);if(L&&!N){let e=!!w.routes[D],t=w.dynamicRoutes[k];if(t&&!1===t.fallback&&!e){if(R.adapterPath)return await I();throw new y.NoFallbackError}}let q=null;!L||E.isDev||N||(q="/index"===(q=D)?"/":q);let P=!0===E.isDev||!L,M=L&&!P;$&&U&&(0,n.setManifestsSingleton)({page:g,clientReferenceManifest:U,serverActionsManifest:$});let j=e.method||"GET",H=(0,i.getTracer)(),K=H.getActiveScopeSpan(),W=!!(null==A?void 0:A.isWrappedByNextServer),B=!!(0,s.getRequestMeta)(e,"minimalMode"),F=(0,s.getRequestMeta)(e,"incrementalCache")||await E.getIncrementalCache(e,R,w,B);null==F||F.resetRequestCache(),globalThis.__incrementalCache=F;let X={params:T,previewProps:w.preview,renderOpts:{experimental:{authInterrupts:!!R.experimental.authInterrupts,useCacheTimeout:R.experimental.useCacheTimeout},cacheComponents:!!R.cacheComponents,validationLevel:R.experimental.instantInsights.validationLevel,supportsDynamicResponse:P,incrementalCache:F,hmrRefreshHash:(0,s.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:R.cacheLife,staticPageGenerationTimeout:R.staticPageGenerationTimeout,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,s)=>E.onRequestError(e,t,a,s,A)},sharedContext:{buildId:x,deploymentId:C}},Q=new l.NodeNextRequest(e),V=new l.NodeNextResponse(t),G=c.NextRequestAdapter.fromNodeNextRequest(Q,(0,c.signalFromNodeResponse)(t)),Y=async({previousCacheEntry:r})=>{try{if(!B&&S&&O&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await E.handle(G,X);e.fetchMetrics=X.renderOpts.fetchMetrics;let i=X.renderOpts.pendingWaitUntil;i&&a.waitUntil&&(a.waitUntil(i),i=void 0);let n=X.renderOpts.collectedTags;if(!L)return await (0,d.sendResponse)(Q,V,s,i),null;{let e=await s.blob(),t=(0,m.toNodeOutgoingHttpHeaders)(s.headers);n&&(t[_.NEXT_CACHE_TAGS_HEADER]=n),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==X.renderOpts.collectedRevalidate&&!(X.renderOpts.collectedRevalidate>=_.INFINITE_CACHE)&&X.renderOpts.collectedRevalidate,a=void 0===X.renderOpts.collectedExpire||X.renderOpts.collectedExpire>=_.INFINITE_CACHE?!1!==r&&r>0?R.expireTime:void 0:X.renderOpts.collectedExpire;return{value:{kind:f.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:g,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,A),t}},z=async(s,n)=>{try{var o,l;let s=await E.handleResponse({req:e,nextConfig:R,cacheKey:q,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:w,isRoutePPREnabled:!1,isOnDemandRevalidate:S,revalidateOnlyGenerated:O,responseGenerator:Y,waitUntil:a.waitUntil,isMinimalMode:B});if(!L)return;if((null==s||null==(o=s.value)?void 0:o.kind)!==f.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==s||null==(l=s.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",S?"REVALIDATED":s.isMiss?"MISS":s.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,m.fromNodeOutgoingHttpHeaders)(s.value.headers);B&&L||i.delete(_.NEXT_CACHE_TAGS_HEADER),!s.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,h.getCacheControlHeader)(s.cacheControl)),await (0,d.sendResponse)(Q,V,new Response(s.value.body,{headers:i,status:s.value.status||200}));return}catch(t){if(t instanceof y.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:k,routeType:"route",revalidateReason:(0,u.getRevalidateReason)({isStaticGeneration:M,isOnDemandRevalidate:S})},!1,A),L)throw t;await (0,d.sendResponse)(Q,V,new Response(null,{status:500}));return}finally{(()=>{if(!s)return;let e=t.statusCode;s.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(s.setStatus({code:i.SpanStatusCode.ERROR}),s.setAttribute("error.type",e.toString()));let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==p.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route")||k,o=`${j} ${a}`;s.setAttributes({"next.route":a,"http.route":a,"next.span_name":o}),s.updateName(o),n&&n!==s&&(n.setAttribute("http.route",a),n.updateName(o))})()}};if(W&&K)await z(K,void 0);else{let t=H.getActiveScopeSpan();await H.withPropagatedContext(e.headers,()=>H.trace(p.BaseServerSpan.handleRequest,{spanName:`${j} ${g}`,kind:i.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},e=>z(e,t)),void 0,!W)}}e.s(["handler",0,C,"patchFetch",0,function(){return(0,a.patchFetch)({workAsyncStorage:g,workUnitAsyncStorage:b})},"routeModule",0,E,"serverHooks",0,x,"workAsyncStorage",0,g,"workUnitAsyncStorage",0,b])},93858,e=>{"use strict";var t=e.i(66680),r=e.i(98323);let a="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en",s="official_certificate_prices",i=e=>e.replace(/&nbsp;|&#160;/gi," ").replace(/&euro;|&#8364;/gi,"€").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&ndash;|&#8211;/gi,"–").replace(/&mdash;|&#8212;/gi,"—").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(),n=e=>{for(let t of[...e].reverse())for(let e of[...t.matchAll(/(?:€\s*)?(\d{1,3})[,.](\d{2,6})\b/g)].reverse()){let t=Number(`${e[1]}.${e[2]}`);if(Number.isFinite(t)&&t>1&&t<1e3)return t}return null},o={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12},l=(e,t,r)=>`${e}-${String(t).padStart(2,"0")}-${String(r).padStart(2,"0")}`,c=e=>{let t=e.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);if(t)return l(Number(t[1]),Number(t[2]),Number(t[3]));let r=e.match(/\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/);if(r)return l(Number(r[3]),Number(r[2]),Number(r[1]));let a=e.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);return a?l(Number(a[3]),o[a[2].toLowerCase()],Number(a[1])):null},p=e=>{let t=new Date(`${e}T00:00:00Z`),r=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-r);let a=t.getUTCFullYear(),s=new Date(Date.UTC(a,0,1));return{year:a,week:Math.ceil(((t.getTime()-s.getTime())/864e5+1)/7)}},u=(e,t)=>{let r=new Date(Date.UTC(e,0,4)),a=r.getUTCDay()||7,s=new Date(r);s.setUTCDate(r.getUTCDate()-a+1+(t-1)*7);let i=new Date(s);return i.setUTCDate(s.getUTCDate()+6),{start:s.toISOString().slice(0,10),end:i.toISOString().slice(0,10)}},d=(e,t)=>({Q1:[`${e}-01-01`,`${e}-03-31`],Q2:[`${e}-04-01`,`${e}-06-30`],Q3:[`${e}-07-01`,`${e}-09-30`],Q4:[`${e}-10-01`,`${e}-12-31`]})[t];async function m(e){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let o=(0,r.neon)(process.env.DATABASE_URL),l=!!e?.force,m=Math.max(1,e?.minIntervalHours??12),h=await o`
    SELECT
      last_attempt_at,
      last_success_at,
      last_error,
      last_items_saved
    FROM cbam_sync_state
    WHERE sync_key = ${s}
    LIMIT 1
  `,_=h[0]?.last_attempt_at?new Date(h[0].last_attempt_at).getTime():0,y=!_||Date.now()-_>=60*m*6e4;if(!l&&!y)return{success:!0,skipped:!0,reason:`Last automatic price-sync attempt was less than ${m} hours ago.`,saved:[]};await o`
    INSERT INTO cbam_sync_state (
      sync_key,
      last_attempt_at,
      updated_at
    )
    VALUES (
      ${s},
      NOW(),
      NOW()
    )
    ON CONFLICT (sync_key)
    DO UPDATE SET
      last_attempt_at = NOW(),
      updated_at = NOW()
  `;try{let e=await fetch(a,{headers:{"User-Agent":"GreenEngineeringTools-CBAM-PriceSync/2.0 (+https://greenengineeringtools.com)",Accept:"text/html"},cache:"no-store"});if(!e.ok)throw Error(`Commission certificate-price page returned HTTP ${e.status}.`);let r=await e.text(),l=t.default.createHash("sha256").update(r).digest("hex"),m=(e=>{let t=new Map;for(let r of(e=>{let t=[];for(let r of e.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){let e=[],a=/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;for(let t of r[1].matchAll(a))e.push(i(t[1]));e.some(Boolean)&&t.push(e)}return t})(e)){let e=r.join(" | "),a=n(r);if(null===a)continue;let s=e.match(/\b(Q[1-4])\s*(20\d{2})\b/i);if(s){let e=s[1].toUpperCase(),i=Number(s[2]);if(2026===i){let[s,n]=d(i,e),o={reportingYear:i,periodType:"quarterly",periodKey:`${i}-${e}`,quarter:e,weekNumber:null,periodStart:s,periodEnd:n,price:a,publishedAt:r.map(c).find(Boolean)??null};t.set(o.periodKey,o);continue}}let i=e.match(/\b(20\d{2})\s*[-/]?\s*W(?:EEK)?\s*0?(\d{1,2})\b/i)||e.match(/\bW(?:EEK)?\s*0?(\d{1,2})\s*[-/,]?\s*(20\d{2})\b/i)||e.match(/\bWEEK\s*0?(\d{1,2})\b[\s\S]*?\b(20\d{2})\b/i),o=null,l=null;if(i){let e=Number(i[1]),t=Number(i[2]);e>=2027?(o=e,l=t):(l=e,o=t)}let m=r.map(c).filter(e=>!!e);if((null===o||null===l)&&m.length){let e=p(m[0]);e.year>=2027&&(o=e.year,l=e.week)}if(null===o||null===l||o<2027||l<1||l>53)continue;let h=u(o,l),_=m.length>1?m[1]:m[0]??null,y={reportingYear:o,periodType:"weekly",periodKey:`${o}-W${String(l).padStart(2,"0")}`,quarter:null,weekNumber:l,periodStart:h.start,periodEnd:h.end,price:a,publishedAt:_};t.set(y.periodKey,y)}return[...t.values()].sort((e,t)=>e.periodKey.localeCompare(t.periodKey))})(r);if(!m.length)throw Error("No explicit official CBAM price rows could be parsed. Existing database prices were left unchanged.");let h=m.find(e=>"2026-Q1"===e.periodKey),_=m.find(e=>"2026-Q2"===e.periodKey);if(h&&Math.abs(h.price-75.36)>.001)throw Error(`Certificate-price parser control failed for 2026-Q1: ${h.price}.`);if(_&&Math.abs(_.price-75.28)>.001)throw Error(`Certificate-price parser control failed for 2026-Q2: ${_.price}.`);let y=[];for(let e of m){let t=await o`
        SELECT price_eur
        FROM cbam_certificate_prices
        WHERE period_key = ${e.periodKey}
        LIMIT 1
      `,r=t[0]?.price_eur===void 0?null:Number(t[0].price_eur),s=null===r?"insert":Math.abs(r-e.price)>1e-9?"correction":"refresh";await o`
        INSERT INTO cbam_certificate_price_history (
          period_key, previous_price_eur, new_price_eur, source_url, source_sha256, change_type
        ) VALUES (
          ${e.periodKey}, ${r}, ${e.price}, ${a}, ${l}, ${s}
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
      `,y.push({periodKey:e.periodKey,year:e.reportingYear,price:e.price,periodType:e.periodType})}return await o`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_success_at,
        last_error,
        last_items_saved,
        updated_at
      )
      VALUES (
        ${s},
        NOW(),
        NOW(),
        NULL,
        ${y.length},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_attempt_at = NOW(),
        last_success_at = NOW(),
        last_error = NULL,
        last_items_saved = ${y.length},
        updated_at = NOW()
    `,{success:!0,skipped:!1,source:a,sourceSha256:l,saved:y}}catch(t){let e=t instanceof Error?t.message:"Unknown CBAM price sync error.";throw await o`
      INSERT INTO cbam_sync_state (
        sync_key,
        last_attempt_at,
        last_error,
        updated_at
      )
      VALUES (
        ${s},
        NOW(),
        ${e},
        NOW()
      )
      ON CONFLICT (sync_key)
      DO UPDATE SET
        last_error = ${e},
        updated_at = NOW()
    `,t}}e.s(["syncOfficialCbamPrices",0,m])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__0lnavp-._.js.map