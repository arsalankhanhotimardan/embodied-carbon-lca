module.exports=[73288,e=>{"use strict";var t=e.i(89171),a=e.i(43793),r=e.i(70368);let i=(e,t)=>Array.from(new Set([t,...Array.isArray(e)?e:[]].filter(e=>"string"==typeof e).map(e=>e.trim()).filter(Boolean))).slice(0,100),n=e=>{if(null==e||""===e)return null;let t=Number(e);return Number.isFinite(t)?t:null},s=(e,t,a)=>n(e?.[t]?.[a]);async function o(){try{let e=await a.db.query(`
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
    `);return t.NextResponse.json({success:!0,data:e.rows},{headers:{"Cache-Control":"no-store"}})}catch(e){return console.error("EPD GET database error:",e),t.NextResponse.json({success:!1,error:"Failed to fetch EPD database."},{status:500})}}async function l(e){let o=(0,r.rejectCrossOriginWrite)(e);if(o)return o;let l=(0,r.jsonSizeGuard)(e);if(l)return l;try{let o=await e.json(),l=Array.isArray(o?.newMaterials)?o.newMaterials:[];if(!l.length)return t.NextResponse.json({success:!1,error:"newMaterials must contain at least one EPD."},{status:400});if(l.length>100)return t.NextResponse.json({success:!1,error:"Maximum 100 EPD records per request."},{status:400});let d=[];for(let e of l){let o=String(e.id||"").trim(),l=String(e.material_name||"").trim();if(!o||!l)return t.NextResponse.json({success:!1,error:"Each EPD requires id and material_name."},{status:400});let u=String(e.source||"EPD").trim().slice(0,50);if("EC3"===u&&!(0,r.isEc3PersistenceAllowed)())return t.NextResponse.json({success:!1,error:"EC3 persistence is disabled. Set EC3_ALLOW_PERSISTENCE=true only when your Building Transparency agreement permits storage/caching."},{status:403});let c=i(e.aliases,l),p=e.modules&&"object"==typeof e.modules?e.modules:{},_=e.metadata&&"object"==typeof e.metadata?e.metadata:{},m=s(p,"A1A3","gwp"),E=s(p,"A5","gwp"),g=s(p,"B1","gwp"),C=s(p,"C4","gwp"),A=s(p,"A1A3","gwpBiogenic"),h=s(p,"A1A3","acidification"),S=s(p,"A1A3","smog"),w=s(p,"A1A3","eutrophication"),y=s(p,"A1A3","ozone"),f=s(p,"A1A3","energy");await a.db.query(`
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
          source = EXCLUDED.source,
          declared_unit = COALESCE(EXCLUDED.declared_unit, epd_materials.declared_unit),
          declared_quantity = COALESCE(EXCLUDED.declared_quantity, epd_materials.declared_quantity),
          mass_kg_per_declared_unit = COALESCE(EXCLUDED.mass_kg_per_declared_unit, epd_materials.mass_kg_per_declared_unit),
          density_kg_m3 = COALESCE(EXCLUDED.density_kg_m3, epd_materials.density_kg_m3),
          lifespan_years = COALESCE(EXCLUDED.lifespan_years, epd_materials.lifespan_years),
          geography = COALESCE(EXCLUDED.geography, epd_materials.geography),
          plant = COALESCE(EXCLUDED.plant, epd_materials.plant),
          pcr = COALESCE(EXCLUDED.pcr, epd_materials.pcr),
          program_operator = COALESCE(EXCLUDED.program_operator, epd_materials.program_operator),
          valid_until = COALESCE(EXCLUDED.valid_until, epd_materials.valid_until),
          modules = COALESCE(EXCLUDED.modules, epd_materials.modules),
          metadata = COALESCE(EXCLUDED.metadata, epd_materials.metadata),
          weight_kg_per_unit = COALESCE(EXCLUDED.weight_kg_per_unit, epd_materials.weight_kg_per_unit),
          gwp_mfg = COALESCE(EXCLUDED.gwp_mfg, epd_materials.gwp_mfg),
          gwp_con = COALESCE(EXCLUDED.gwp_con, epd_materials.gwp_con),
          gwp_use = COALESCE(EXCLUDED.gwp_use, epd_materials.gwp_use),
          gwp_eol = COALESCE(EXCLUDED.gwp_eol, epd_materials.gwp_eol),
          gwp_biogenic = COALESCE(EXCLUDED.gwp_biogenic, epd_materials.gwp_biogenic),
          traci_acidification = COALESCE(EXCLUDED.traci_acidification, epd_materials.traci_acidification),
          traci_smog = COALESCE(EXCLUDED.traci_smog, epd_materials.traci_smog),
          traci_eutrophication = COALESCE(EXCLUDED.traci_eutrophication, epd_materials.traci_eutrophication),
          traci_ozone = COALESCE(EXCLUDED.traci_ozone, epd_materials.traci_ozone),
          traci_energy = COALESCE(EXCLUDED.traci_energy, epd_materials.traci_energy),
          updated_at = NOW()
        `,[o,l,JSON.stringify(c),e.manufacturer||null,e.category||null,u,e.declared_unit||"unit",n(e.declared_quantity)??1,n(e.mass_kg_per_declared_unit),n(e.density_kg_m3),n(e.lifespan_years),e.geography||null,e.plant||null,e.pcr||null,e.program_operator||null,e.valid_until||null,JSON.stringify(p),JSON.stringify(_),n(e.mass_kg_per_declared_unit),m,E,g,C,A,h,S,w,y,f]),d.push(o)}return t.NextResponse.json({success:!0,saved:d,count:d.length})}catch(e){return console.error("EPD POST database error:",e),t.NextResponse.json({success:!1,error:"Failed to persist EPD data."},{status:500})}}e.s(["GET",0,o,"POST",0,l,"dynamic",0,"force-dynamic","runtime",0,"nodejs"])},33293,e=>{"use strict";var t=e.i(47909),a=e.i(74017),r=e.i(96250),i=e.i(59756),n=e.i(61916),s=e.i(74677),o=e.i(69741),l=e.i(16795),d=e.i(87718),u=e.i(95169),c=e.i(47587),p=e.i(66012),_=e.i(70101),m=e.i(26937),E=e.i(10372),g=e.i(93695);e.i(52474);var C=e.i(220);let A=new t.AppRouteRouteModule({definition:{kind:a.RouteKind.APP_ROUTE,page:"/api/epd/route",pathname:"/api/epd",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/app/api/epd/route.ts",nextConfigOutput:"standalone",userland:()=>e.r(73288),...{}}),{workAsyncStorage:h,workUnitAsyncStorage:S,serverHooks:w}=A;async function y(e,t,r){r.requestMeta&&(0,i.setRequestMeta)(e,r.requestMeta),A.isDev&&(0,i.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let h="/api/epd/route";h=h.replace(/\/index$/,"")||"/";let S=await A.prepare(e,t,{srcPage:h,multiZoneDraftMode:!1});if(!S)return t.statusCode=400,t.end("Bad Request"),null==r.waitUntil||r.waitUntil.call(r,Promise.resolve()),null;let{buildId:w,deploymentId:y,params:f,nextConfig:D,parsedUrl:R,isDraftMode:L,prerenderManifest:O,routerServerContext:v,isOnDemandRevalidate:b,revalidateOnlyGenerated:x,resolvedPathname:N,clientReferenceManifest:T,serverActionsManifest:U}=S,P=(0,o.normalizeAppPath)(h),$=!!(O.dynamicRoutes[P]||O.routes[N]),j=async()=>((null==v?void 0:v.render404)?await v.render404(e,t,R,!1):t.end("This page could not be found"),null);if($&&!L){let e=!!O.routes[N],t=O.dynamicRoutes[P];if(t&&!1===t.fallback&&!e){if(D.adapterPath)return await j();throw new g.NoFallbackError}}let k=null;!$||A.isDev||L||(k="/index"===(k=N)?"/":k);let X=!0===A.isDev||!$,q=$&&!X;U&&T&&(0,s.setManifestsSingleton)({page:h,clientReferenceManifest:T,serverActionsManifest:U});let I=e.method||"GET",M=(0,n.getTracer)(),H=M.getActiveScopeSpan(),F=!!(null==v?void 0:v.isWrappedByNextServer),B=!!(0,i.getRequestMeta)(e,"minimalMode"),z=(0,i.getRequestMeta)(e,"incrementalCache")||await A.getIncrementalCache(e,D,O,B);null==z||z.resetRequestCache(),globalThis.__incrementalCache=z;let G={params:f,previewProps:O.preview,renderOpts:{experimental:{authInterrupts:!!D.experimental.authInterrupts,useCacheTimeout:D.experimental.useCacheTimeout},cacheComponents:!!D.cacheComponents,validationLevel:D.experimental.instantInsights.validationLevel,supportsDynamicResponse:X,incrementalCache:z,hmrRefreshHash:(0,i.getRequestMeta)(e,"hmrRefreshHash"),cacheLifeProfiles:D.cacheLife,staticPageGenerationTimeout:D.staticPageGenerationTimeout,waitUntil:r.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,r,i)=>A.onRequestError(e,t,r,i,v)},sharedContext:{buildId:w,deploymentId:y}},K=new l.NodeNextRequest(e),W=new l.NodeNextResponse(t),J=d.NextRequestAdapter.fromNodeNextRequest(K,(0,d.signalFromNodeResponse)(t)),V=async({previousCacheEntry:a})=>{try{if(!B&&b&&x&&!a)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let i=await A.handle(J,G);e.fetchMetrics=G.renderOpts.fetchMetrics;let n=G.renderOpts.pendingWaitUntil;n&&r.waitUntil&&(r.waitUntil(n),n=void 0);let s=G.renderOpts.collectedTags;if(!$)return await (0,p.sendResponse)(K,W,i,n),null;{let e=await i.blob(),t=(0,_.toNodeOutgoingHttpHeaders)(i.headers);s&&(t[E.NEXT_CACHE_TAGS_HEADER]=s),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==G.renderOpts.collectedRevalidate&&!(G.renderOpts.collectedRevalidate>=E.INFINITE_CACHE)&&G.renderOpts.collectedRevalidate,r=void 0===G.renderOpts.collectedExpire||G.renderOpts.collectedExpire>=E.INFINITE_CACHE?!1!==a&&a>0?D.expireTime:void 0:G.renderOpts.collectedExpire;return{value:{kind:C.CachedRouteKind.APP_ROUTE,status:i.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:r}}}}catch(t){throw(null==a?void 0:a.isStale)&&await A.onRequestError(e,t,{routerKind:"App Router",routePath:h,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:b})},!1,v),t}},Y=async(i,s)=>{try{var o,l;let i=await A.handleResponse({req:e,nextConfig:D,cacheKey:k,routeKind:a.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:b,revalidateOnlyGenerated:x,responseGenerator:V,waitUntil:r.waitUntil,isMinimalMode:B});if(!$)return;if((null==i||null==(o=i.value)?void 0:o.kind)!==C.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==i||null==(l=i.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});B||t.setHeader("x-nextjs-cache",b?"REVALIDATED":i.isMiss?"MISS":i.isStale?"STALE":"HIT"),L&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let n=(0,_.fromNodeOutgoingHttpHeaders)(i.value.headers);B&&$||n.delete(E.NEXT_CACHE_TAGS_HEADER),!i.cacheControl||t.getHeader("Cache-Control")||n.get("Cache-Control")||n.set("Cache-Control",(0,m.getCacheControlHeader)(i.cacheControl)),await (0,p.sendResponse)(K,W,new Response(i.value.body,{headers:n,status:i.value.status||200}));return}catch(t){if(t instanceof g.NoFallbackError||await A.onRequestError(e,t,{routerKind:"App Router",routePath:P,routeType:"route",revalidateReason:(0,c.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:b})},!1,v),$)throw t;await (0,p.sendResponse)(K,W,new Response(null,{status:500}));return}finally{(()=>{if(!i)return;let e=t.statusCode;i.setAttributes({"http.status_code":e,"next.rsc":!1}),e&&e>=500&&(i.setStatus({code:n.SpanStatusCode.ERROR}),i.setAttribute("error.type",e.toString()));let a=M.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==u.BaseServerSpan.handleRequest)return console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let r=a.get("next.route")||P,o=`${I} ${r}`;i.setAttributes({"next.route":r,"http.route":r,"next.span_name":o}),i.updateName(o),s&&s!==i&&(s.setAttribute("http.route",r),s.updateName(o))})()}};if(F&&H)await Y(H,void 0);else{let t=M.getActiveScopeSpan();await M.withPropagatedContext(e.headers,()=>M.trace(u.BaseServerSpan.handleRequest,{spanName:`${I} ${h}`,kind:n.SpanKind.SERVER,attributes:{"http.method":I,"http.target":e.url}},e=>Y(e,t)),void 0,!F)}}e.s(["handler",0,y,"patchFetch",0,function(){return(0,r.patchFetch)({workAsyncStorage:h,workUnitAsyncStorage:S})},"routeModule",0,A,"serverHooks",0,w,"workAsyncStorage",0,h,"workUnitAsyncStorage",0,S])}];

//# sourceMappingURL=_1k5_kiu._.js.map