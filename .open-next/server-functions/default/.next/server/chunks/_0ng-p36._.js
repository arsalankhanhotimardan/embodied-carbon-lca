module.exports=[38503,e=>{"use strict";var t=e.i(98323),a=e.i(89171);let r=e=>{if(null==e||""===e)return null;let t=Number(e);return Number.isFinite(t)?t:null},n=e=>"string"!=typeof e?null:e.trim()||null;async function i(e){try{if(!process.env.DATABASE_URL)return a.NextResponse.json({success:!1,error:"DATABASE_URL is not configured."},{status:500});let i=(0,t.neon)(process.env.DATABASE_URL),o=new URL(e.url),l=Number(o.searchParams.get("year")||"2026"),s=Number.isInteger(l)&&l>=2026&&l<=2100?l:2026,u=await i`
      SELECT
        price_eur,
        updated_at
      FROM eu_ets_pricing
      WHERE price_eur IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `,c=u.length>0?r(u[0].price_eur):null,d=u.length>0?u[0].updated_at:null,p=(await i`
      SELECT
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
        source_url
      FROM cbam_certificate_prices
      WHERE reporting_year = ${s}
      ORDER BY
        COALESCE(period_start, published_at) ASC,
        period_key ASC
    `).map(e=>({year:Number(e.reporting_year),periodType:n(e.period_type),periodKey:n(e.period_key),quarter:n(e.quarter),week:r(e.week_number),periodStart:e.period_start,periodEnd:e.period_end,price:r(e.price_eur),official:!!e.official,publishedAt:e.published_at,source:n(e.source_url)})),f=(await i`
      SELECT
        id,
        name,
        cn_code AS cn,

        sector,
        country_of_origin AS country,
        production_route AS "productionRoute",

        default_ef AS "defaultEf",
        default_ef_2026 AS "defaultEf2026",
        default_ef_2027 AS "defaultEf2027",
        default_ef_2028_plus AS "defaultEf2028Plus",

        actual_ef AS "actualEf",
        actual_verified AS "actualVerified",

        cbam_benchmark AS benchmark,
        cbam_benchmark_actual AS "benchmarkActual",
        cbam_benchmark_default AS "benchmarkDefault",

        sefa_actual_2026 AS "sefaActual2026",
        sefa_default_2026 AS "sefaDefault2026",

        source,
        source_version AS "sourceVersion",
        updated_at AS "updatedAt"
      FROM cbam_products
      ORDER BY name ASC, country_of_origin ASC NULLS LAST, production_route ASC NULLS LAST
    `).map(e=>({id:String(e.id),name:String(e.name??""),cn:String(e.cn??""),sector:n(e.sector),country:n(e.country),productionRoute:n(e.productionRoute),defaultEf:r(e.defaultEf),defaultEf2026:r(e.defaultEf2026),defaultEf2027:r(e.defaultEf2027),defaultEf2028Plus:r(e.defaultEf2028Plus),actualEf:r(e.actualEf),actualVerified:!!e.actualVerified,benchmark:r(e.benchmark),benchmarkActual:r(e.benchmarkActual),benchmarkDefault:r(e.benchmarkDefault),sefaActual2026:r(e.sefaActual2026),sefaDefault2026:r(e.sefaDefault2026),source:n(e.source),sourceVersion:n(e.sourceVersion),updatedAt:e.updatedAt})),h={totalProducts:f.length,missingSector:f.filter(e=>!e.sector).length,missingCountry:f.filter(e=>!e.country).length,missing2026Default:f.filter(e=>null===e.defaultEf2026&&null===e.defaultEf).length,missingBenchmarkOrSefa:f.filter(e=>null===e.benchmark&&null===e.benchmarkActual&&null===e.benchmarkDefault&&null===e.sefaActual2026&&null===e.sefaDefault2026).length};return a.NextResponse.json({success:!0,etsPrice:c,planningEtsPrice:c,planningEtsUpdatedAt:d,requestedYear:s,prices:p,products:f,dataQuality:h,regulatoryNotes:{certificatePrice2026:"Official CBAM certificate prices are quarterly in 2026.",certificatePrice2027Plus:"Official CBAM certificate prices are weekly from 2027 onward.",marketPrice:"planningEtsPrice is a live/planning ETS market input and is not automatically the legal CBAM certificate price for a 2026 import.",defaultValues:"Definitive-period default values are country/CN/sector specific and must use the applicable regulatory markup.",freeAllocation:"A defensible net certificate quantity requires the CBAM free-allocation adjustment (benchmark/SEFA), not merely a flat phase-in multiplier."}},{headers:{"Cache-Control":"no-store"}})}catch(e){return console.error("CBAM Database Error:",e),a.NextResponse.json({success:!1,error:e instanceof Error?e.message:"Database connection failed."},{status:500})}}e.s(["GET",0,i,"dynamic",0,"force-dynamic","runtime",0,"nodejs"])},80880,e=>{"use strict";var t=e.i(47909),a=e.i(74017),r=e.i(96250),n=e.i(59756),i=e.i(61916),o=e.i(74677),l=e.i(69741),s=e.i(16795),u=e.i(87718),c=e.i(95169),d=e.i(47587),p=e.i(66012),f=e.i(70101),h=e.i(26937),m=e.i(10372),R=e.i(93695);e.i(52474);var _=e.i(220);let A=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/cbam/route",pathname:"/api/cbam",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/cbam/route.ts",nextConfigOutput:"standalone",userland:()=>e.r(38503),...{}}),{workAsyncStorage:E,workUnitAsyncStorage:g,serverHooks:S}=A;async function b(e,t,r){r.requestMeta&&(0,n.setRequestMeta)(e,r.requestMeta),A.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let E="/api/cbam/route";E=E.replace(/\/index$/,"")||"/";let g=await A.prepare(e,t,{srcPage:E,multiZoneDraftMode:!1});if(!g)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:S,deploymentId:b,params:v,nextConfig:C,parsedUrl:y,isDraftMode:w,prerenderManifest:T,routerServerContext:k,isOnDemandRevalidate:N,revalidateOnlyGenerated:x,resolvedPathname:P,clientReferenceManifest:D,serverActionsManifest:O}=g,q=(0,l.normalizeAppPath)(E),M=!!(T.dynamicRoutes[q]||T.routes[P]),L=async()=>((null==k?void 0:k.render404)?await k.render404(e,t,y,!1):t.end("This page could not be found"),null);if(M&&!w){let e=!!T.routes[P],t=T.dynamicRoutes[q];if(t&&!1===t.fallback&&!e){if(C.adapterPath)return await L();throw new R.NoFallbackError}}let U=null;!M||A.isDev||w||(U="/index"===(U=P)?"/":U);let H=!0===A.isDev||!M,I=M&&!H;O&&D&&(0,o.setManifestsSingleton)({page:E,clientReferenceManifest:D,serverActionsManifest:O});let B=e.method||"GET",F=(0,i.getTracer)(),j=F.getActiveScopeSpan(),V=!!(null==k?void 0:k.isWrappedByNextServer),K=!!(0,n.getRequestMeta)(e,"minimalMode"),$=(0,n.getRequestMeta)(e,"incrementalCache")||await A.getIncrementalCache(e,C,T,K);null==$||$.resetRequestCache(),globalThis.__incrementalCache=$;let G={params:v,previewProps:T.preview,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts,useCacheTimeout:C.experimental.useCacheTimeout},cacheComponents:!!C.cacheComponents,validationLevel:C.experimental.instantInsights.validationLevel,supportsDynamicResponse:H,incrementalCache:$,hmrRefreshHash:(0,n.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:C.cacheLife,staticPageGenerationTimeout:C.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,n)=>A.onRequestError(e,t,r,n,k)},sharedContext:{buildId:S,deploymentId:b}},W=new s.NodeNextRequest(e),X=new s.NodeNextResponse(t),Y=u.NextRequestAdapter.fromNodeNextRequest(W,(0,u.signalFromNodeResponse)(t)),z=async({previousCacheEntry:a})=>{try{if(!K&&N&&x&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await A.handle(Y,G);e.fetchMetrics=G.renderOpts.fetchMetrics;let i=G.renderOpts.pendingWaitUntil;i&&r.waitUntil&&(r.waitUntil(i),i=void 0);let o=G.renderOpts.collectedTags;if(!M)return await (0,p.sendResponse)(W,X,n,i),null;{let e=await n.blob(),t=(0,f.toNodeOutgoingHttpHeaders)(n.headers);o&&(t[m.NEXT_CACHE_TAGS_HEADER]=o),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,r=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=m.INFINITE_CACHE?!1!==a&&a>0?C.expireTime:void 0:G.renderOpts.collectedExpire;return{value:{kind:_.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:N})},!1,k),t}},Z=async(n,o)=>{try{var l,s;let n=await A.handleResponse({req:e,nextConfig:C,cacheKey:U,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:T,isRoutePPREnabled:!1,isOnDemandRevalidate:N,revalidateOnlyGenerated:x,responseGenerator:z,waitUntil:r.waitUntil,isMinimalMode:K});if(!M)return;if((null==n||null==(l=n.value)?void 0:l.kind)!==_.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==n||null==(s=n.value)?void 0:s.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});K||t.setHeader("x-nextjs-cache",N?"REVALIDATED":n.isMiss?"MISS":n.isStale?"STALE":"HIT"),w&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let i=(0,f.fromNodeOutgoingHttpHeaders)(n.value.headers);K&&M||i.delete(m.NEXT_CACHE_TAGS_HEADER),!n.cacheControl||t.getHeader("Cache-Control")||i.get("Cache-Control")||i.set("Cache-Control",(0,h.getCacheControlHeader)(n.cacheControl)),await (0,p.sendResponse)(W,X,new Response(n.value.body,{headers:i,status:n.value.status||200}));return}catch(t){if(t instanceof R.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:q,routeType:"route",revalidateReason:(0,d.getRevalidateReason)({isStaticGeneration:I,isOnDemandRevalidate:N})},!1,k),M)throw t;await (0,p.sendResponse)(W,X,new Response(null,{status:500}));return}finally{(()=>{if(!n)return;let e=t.statusCode;n.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(n.setStatus({code:i.SpanStatusCode.ERROR}),n.setAttribute("error.type",e.toString()));let a=F.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==c.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route")||q,l=`${B} ${r}`;n.setAttributes({"next.route":r,"http.route":r,"next.span_name":l}),n.updateName(l),o&&o!==n&&(o.setAttribute("http.route",r),o.updateName(l))})()}};if(V&&j)await Z(j,void 0);else{let t=F.getActiveScopeSpan();await F.withPropagatedContext(e.headers,()=>F.trace(c.BaseServerSpan.handleRequest,{spanName:`${B} ${E}`,kind:i.SpanKind.SERVER,attributes:{"http.method":B,"http.target":e.url}},e=>Z(e,t)),void 0,!V)}}e.s(["handler",0,b,"patchFetch",0,function(){return(0,r.patchFetch)({workAsyncStorage:E,workUnitAsyncStorage:g})},"routeModule",0,A,"serverHooks",0,S,"workAsyncStorage",0,E,"workUnitAsyncStorage",0,g])}];

//# sourceMappingURL=_0ng-p36._.js.map