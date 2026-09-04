module.exports=[73288,e=>{"use strict";var t=e.i(89171),a=e.i(43793),r=e.i(70368);let i=e=>{if(null==e||""===e)return null;let t=Number(e);return Number.isFinite(t)?t:null},n=(e,t,a)=>i(e?.[t]?.[a]),s=e=>!!e&&"object"==typeof e&&!Array.isArray(e)&&Object.keys(e).length>0;async function o(){try{let e=await a.db.query(`
      SELECT
        COALESCE(m.external_id, 'legacy-' || m.id::text) AS id,
        m.id AS internal_db_id,
        m.material_name,
        COALESCE(m.aliases, '[]'::jsonb) AS aliases,
        m.manufacturer,
        m.category,
        COALESCE(m.source, 'Legacy') AS source,
        COALESCE(m.declared_unit, 'unit') AS declared_unit,
        COALESCE(m.declared_quantity, 1) AS declared_quantity,
        m.mass_kg_per_declared_unit,
        m.density_kg_m3,
        m.lifespan_years,
        m.geography,
        m.plant,
        m.pcr,
        m.program_operator,
        m.valid_until,
        COALESCE(m.modules, '{}'::jsonb) AS modules,
        COALESCE(m.metadata, '{}'::jsonb) AS metadata,

        -- Existing/legacy compatibility fields:
        m.weight_kg_per_unit,
        m.gwp_mfg,
        m.gwp_con,
        m.gwp_use,
        m.gwp_eol,
        m.gwp_biogenic,
        m.traci_acidification,
        m.traci_smog,
        m.traci_eutrophication,
        m.traci_ozone,
        m.traci_energy,

        alt.material_name AS alt_name,
        alt.gwp_mfg AS alt_gwp_mfg,
        alt.gwp_con AS alt_gwp_con,
        alt.gwp_use AS alt_gwp_use,
        alt.gwp_eol AS alt_gwp_eol,
        alt.gwp_biogenic AS alt_gwp_biogenic
      FROM epd_materials m
      LEFT JOIN epd_materials alt ON m.optimized_alt_id = alt.id
      ORDER BY m.material_name ASC
    `);return t.NextResponse.json({success:!0,data:e.rows},{headers:{"Cache-Control":"no-store"}})}catch(e){return console.error("EPD GET database error:",e),t.NextResponse.json({success:!1,error:"Failed to fetch EPD database."},{status:500})}}async function l(e){let o=(0,r.rejectCrossOriginWrite)(e);if(o)return o;let l=(0,r.jsonSizeGuard)(e);if(l)return l;try{let o=await e.json(),l=Array.isArray(o?.newMaterials)?o.newMaterials:[];if(!l.length)return t.NextResponse.json({success:!1,error:"newMaterials must contain at least one EPD."},{status:400});if(l.length>100)return t.NextResponse.json({success:!1,error:"Maximum 100 EPD records per request."},{status:400});let d=l.map((e,t)=>{var a;let i,n,o=String(e.id||"").trim(),l=String(e.material_name||"").trim();if(!o||!l)throw Error(`VALIDATION: Item ${t+1} requires id and material_name.`);let d=String(e.source||"EPD").trim().slice(0,50),u=(a=e.aliases,Array.from(new Set([l,...Array.isArray(a)?a:[]].filter(e=>"string"==typeof e).map(e=>e.trim()).filter(Boolean))).slice(0,100)),c=s(e.modules)?e.modules:{},p=s(e.metadata)?e.metadata:{},E=(i=d.trim().toLowerCase(),n=String(p?.source||"").trim().toLowerCase(),"ec3"===i||n.includes("building transparency")||n.includes("openepd"));if(E&&!(0,r.isEc3PersistenceAllowed)())throw Error("EC3_DISABLED: EC3 persistence is disabled. Set EC3_ALLOW_PERSISTENCE=true only when your Building Transparency agreement permits storage/caching.");let _=E?"EC3":d;return{material:e,externalId:o,materialName:l,aliases:u,modules:c,metadata:p,source:_}}),u=[];for(let e of d){let{material:t,externalId:r,materialName:s,aliases:o,modules:l,metadata:d,source:c}=e,p=n(l,"A1A3","gwp"),E=n(l,"A5","gwp"),_=n(l,"B1","gwp"),m=n(l,"C4","gwp"),g=n(l,"A1A3","gwpBiogenic"),C=n(l,"A1A3","acidification"),A=n(l,"A1A3","smog"),h=n(l,"A1A3","eutrophication"),S=n(l,"A1A3","ozone"),D=n(l,"A1A3","energy"),L=String(t.declared_unit||"").trim()||"unit";await a.db.query(`
        INSERT INTO epd_materials (
          external_id,
          material_name,
          aliases,
          manufacturer,
          category,
          source,
          declared_unit,
          declared_quantity,
          mass_kg_per_declared_unit,
          density_kg_m3,
          lifespan_years,
          geography,
          plant,
          pcr,
          program_operator,
          valid_until,
          modules,
          metadata,
          weight_kg_per_unit,
          gwp_mfg,
          gwp_con,
          gwp_use,
          gwp_eol,
          gwp_biogenic,
          traci_acidification,
          traci_smog,
          traci_eutrophication,
          traci_ozone,
          traci_energy,
          updated_at
        )
        VALUES (
          $1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          $17::jsonb,$18::jsonb,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW()
        )
        ON CONFLICT (external_id)
        DO UPDATE SET
          material_name = EXCLUDED.material_name,
          aliases = (
            SELECT COALESCE(jsonb_agg(DISTINCT alias_value), '[]'::jsonb)
            FROM jsonb_array_elements_text(
              COALESCE(epd_materials.aliases, '[]'::jsonb)
              || COALESCE(EXCLUDED.aliases, '[]'::jsonb)
            ) AS merged(alias_value)
          ),
          manufacturer = COALESCE(EXCLUDED.manufacturer, epd_materials.manufacturer),
          category = COALESCE(EXCLUDED.category, epd_materials.category),

          -- Do not downgrade a known EC3 record to a generic source label.
          source = CASE
            WHEN epd_materials.source = 'EC3' AND EXCLUDED.source <> 'EC3'
              THEN epd_materials.source
            ELSE EXCLUDED.source
          END,

          -- A sparse search result often carries the generic fallback "unit".
          -- Do not let it overwrite a richer declared basis already stored.
          declared_unit = CASE
            WHEN LOWER(TRIM(COALESCE(EXCLUDED.declared_unit, ''))) IN ('', 'unit', '1 unit')
                 AND epd_materials.declared_unit IS NOT NULL
              THEN epd_materials.declared_unit
            ELSE COALESCE(EXCLUDED.declared_unit, epd_materials.declared_unit)
          END,

          declared_quantity = CASE
            WHEN LOWER(TRIM(COALESCE(EXCLUDED.declared_unit, ''))) IN ('', 'unit', '1 unit')
                 AND epd_materials.declared_quantity IS NOT NULL
              THEN epd_materials.declared_quantity
            ELSE COALESCE(EXCLUDED.declared_quantity, epd_materials.declared_quantity)
          END,

          mass_kg_per_declared_unit = COALESCE(
            EXCLUDED.mass_kg_per_declared_unit,
            epd_materials.mass_kg_per_declared_unit
          ),
          density_kg_m3 = COALESCE(
            EXCLUDED.density_kg_m3,
            epd_materials.density_kg_m3
          ),
          lifespan_years = COALESCE(
            EXCLUDED.lifespan_years,
            epd_materials.lifespan_years
          ),
          geography = COALESCE(EXCLUDED.geography, epd_materials.geography),
          plant = COALESCE(EXCLUDED.plant, epd_materials.plant),
          pcr = COALESCE(EXCLUDED.pcr, epd_materials.pcr),
          program_operator = COALESCE(
            EXCLUDED.program_operator,
            epd_materials.program_operator
          ),
          valid_until = COALESCE(EXCLUDED.valid_until, epd_materials.valid_until),

          -- IMPORTANT: '{}' is not NULL. The old upsert could replace a rich
          -- EPD with an empty modules object. Preserve the rich record instead.
          modules = CASE
            WHEN EXCLUDED.modules IS NOT NULL
                 AND EXCLUDED.modules <> '{}'::jsonb
              THEN EXCLUDED.modules
            ELSE epd_materials.modules
          END,

          -- Merge audit metadata instead of replacing it with an empty object.
          metadata =
            COALESCE(epd_materials.metadata, '{}'::jsonb)
            || COALESCE(EXCLUDED.metadata, '{}'::jsonb),

          weight_kg_per_unit = COALESCE(
            EXCLUDED.weight_kg_per_unit,
            epd_materials.weight_kg_per_unit
          ),
          gwp_mfg = COALESCE(EXCLUDED.gwp_mfg, epd_materials.gwp_mfg),
          gwp_con = COALESCE(EXCLUDED.gwp_con, epd_materials.gwp_con),
          gwp_use = COALESCE(EXCLUDED.gwp_use, epd_materials.gwp_use),
          gwp_eol = COALESCE(EXCLUDED.gwp_eol, epd_materials.gwp_eol),
          gwp_biogenic = COALESCE(
            EXCLUDED.gwp_biogenic,
            epd_materials.gwp_biogenic
          ),
          traci_acidification = COALESCE(
            EXCLUDED.traci_acidification,
            epd_materials.traci_acidification
          ),
          traci_smog = COALESCE(
            EXCLUDED.traci_smog,
            epd_materials.traci_smog
          ),
          traci_eutrophication = COALESCE(
            EXCLUDED.traci_eutrophication,
            epd_materials.traci_eutrophication
          ),
          traci_ozone = COALESCE(
            EXCLUDED.traci_ozone,
            epd_materials.traci_ozone
          ),
          traci_energy = COALESCE(
            EXCLUDED.traci_energy,
            epd_materials.traci_energy
          ),
          updated_at = NOW()
        `,[r,s,JSON.stringify(o),t.manufacturer||null,t.category||null,c,L,i(t.declared_quantity)??1,i(t.mass_kg_per_declared_unit),i(t.density_kg_m3),i(t.lifespan_years),t.geography||null,t.plant||null,t.pcr||null,t.program_operator||null,t.valid_until||null,JSON.stringify(l),JSON.stringify(d),i(t.mass_kg_per_declared_unit),p,E,_,m,g,C,A,h,S,D]),u.push(r)}return t.NextResponse.json({success:!0,saved:u,count:u.length})}catch(a){let e=a instanceof Error?a.message:"Failed to persist EPD data.";if(e.startsWith("VALIDATION:"))return t.NextResponse.json({success:!1,error:e.replace(/^VALIDATION:\s*/,"")},{status:400});if(e.startsWith("EC3_DISABLED:"))return t.NextResponse.json({success:!1,error:e.replace(/^EC3_DISABLED:\s*/,"")},{status:403});return console.error("EPD POST database error:",a),t.NextResponse.json({success:!1,error:"Failed to persist EPD data."},{status:500})}}e.s(["GET",0,o,"POST",0,l,"dynamic",0,"force-dynamic","runtime",0,"nodejs"])},33293,e=>{"use strict";var t=e.i(47909),a=e.i(74017),r=e.i(96250),i=e.i(59756),n=e.i(61916),s=e.i(74677),o=e.i(69741),l=e.i(16795),d=e.i(87718),u=e.i(95169),c=e.i(47587),p=e.i(66012),E=e.i(70101),_=e.i(26937),m=e.i(10372),g=e.i(93695);e.i(52474);var C=e.i(220);let A=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/epd/route",pathname:"/api/epd",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/epd/route.ts",nextConfigOutput:"standalone",userland:()=>e.r(73288),...{}}),{workAsyncStorage:h,workUnitAsyncStorage:S,serverHooks:D}=A;async function L(e,t,r){r.requestMeta&&(0,i.setRequestMeta)(e,r.requestMeta),A.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/epd/route";h=h.replace(/\/index$/,"")||"/";let S=await A.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:D,deploymentId:L,params:w,nextConfig:y,parsedUrl:f,isDraftMode:O,prerenderManifest:R,routerServerContext:N,isOnDemandRevalidate:v,revalidateOnlyGenerated:b,resolvedPathname:T,clientReferenceManifest:U,serverActionsManifest:x}=S,I=(0,o.normalizeAppPath)(h),P=!!(R.dynamicRoutes[I]||R.routes[T]),j=async()=>((null==N?void 0:N.render404)?await N.render404(e,t,f,!1):t.end("This page could not be found"),null);if(P&&!O){let e=!!R.routes[T],t=R.dynamicRoutes[I];if(t&&!1===t.fallback&&!e){if(y.adapterPath)return await j();throw new g.NoFallbackError}}let $=null;!P||A.isDev||O||($="/index"===($=T)?"/":$);let X=!0===A.isDev||!P,k=P&&!X;x&&U&&(0,s.setManifestsSingleton)({page:h,clientReferenceManifest:U,serverActionsManifest:x});let q=e.method||"GET",H=(0,n.getTracer)(),M=H.getActiveScopeSpan(),F=!!(null==N?void 0:N.isWrappedByNextServer),B=!!(0,i.getRequestMeta)(e,"minimalMode"),W=(0,i.getRequestMeta)(e,"incrementalCache")||await A.getIncrementalCache(e,y,R,B);null==W||W.resetRequestCache(),globalThis.__incrementalCache=W;let z={params:w,previewProps:R.preview,renderOpts:{experimental:{authInterrupts:!!y.experimental.authInterrupts,useCacheTimeout:y.experimental.useCacheTimeout},cacheComponents:!!y.cacheComponents,validationLevel:y.experimental.instantInsights.validationLevel,supportsDynamicResponse:X,incrementalCache:W,hmrRefreshHash:(0,i.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:y.cacheLife,staticPageGenerationTimeout:y.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>A.onRequestError(e,t,r,i,N)},sharedContext:{buildId:D,deploymentId:L}},G=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),V=d.NextRequestAdapter.fromNodeNextRequest(G,(0,d.signalFromNodeResponse)(t)),J=async({previousCacheEntry:a})=>{try{if(!B&&v&&b&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await A.handle(V,z);e.fetchMetrics=z.renderOpts.fetchMetrics;let n=z.renderOpts.pendingWaitUntil;n&&r.waitUntil&&(r.waitUntil(n),n=void 0);let s=z.renderOpts.collectedTags;if(!P)return await (0,p.sendResponse)(G,K,i,n),null;{let e=await i.blob(),t=(0,E.toNodeOutgoingHttpHeaders)(i.headers);s&&(t[m.NEXT_CACHE_TAGS_HEADER]=s),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==z.renderOpts.collectedRevalidate&&!(z.renderOpts.collectedRevalidate>=m.INFINITE_CACHE)&&z.renderOpts.collectedRevalidate,r=void 0===z.renderOpts.collectedExpire||z.renderOpts.collectedExpire>=m.INFINITE_CACHE?!1!==a&&a>0?y.expireTime:void 0:z.renderOpts.collectedExpire;return{value:{kind:C.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:v})},!1,N),t}},Y=async(i,s)=>{try{var o,l;let i=await A.handleResponse({req:e,nextConfig:y,cacheKey:$,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:R,isRoutePPREnabled:!1,isOnDemandRevalidate:v,revalidateOnlyGenerated:b,responseGenerator:J,waitUntil:r.waitUntil,isMinimalMode:B});if(!P)return;if((null==i||null==(o=i.value)?void 0:o.kind)!==C.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==i||null==(l=i.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",v?"REVALIDATED":i.isMiss?"MISS":i.isStale?"STALE":"HIT"),O&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let n=(0,E.fromNodeOutgoingHttpHeaders)(i.value.headers);B&&P||n.delete(m.NEXT_CACHE_TAGS_HEADER),!i.cacheControl||t.getHeader("Cache-Control")||n.get("Cache-Control")||n.set("Cache-Control",(0,_.getCacheControlHeader)(i.cacheControl)),await (0,p.sendResponse)(G,K,new Response(i.value.body,{headers:n,status:i.value.status||200}));return}catch(t){if(t instanceof g.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:I,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:k,isOnDemandRevalidate:v})},!1,N),P)throw t;await (0,p.sendResponse)(G,K,new Response(null,{status:500}));return}finally{(()=>{if(!i)return;let e=t.statusCode;i.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(i.setStatus({code:n.SpanStatusCode.ERROR}),i.setAttribute("error.type",e.toString()));let a=H.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route")||I,o=`${q} ${r}`;i.setAttributes({"next.route":r,"http.route":r,"next.span_name":o}),i.updateName(o),s&&s!==i&&(s.setAttribute("http.route",r),s.updateName(o))})()}};if(F&&M)await Y(M,void 0);else{let t=H.getActiveScopeSpan();await H.withPropagatedContext(e.headers,()=>H.trace(u.BaseServerSpan.handleRequest,{spanName:`${q} ${h}`,kind:n.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},e=>Y(e,t)),void 0,!F)}}e.s(["handler",0,L,"patchFetch",0,function(){return(0,r.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:S})},"routeModule",0,A,"serverHooks",0,D,"workAsyncStorage",0,h,"workUnitAsyncStorage",0,S])}];

//# sourceMappingURL=_1k5_kiu._.js.map