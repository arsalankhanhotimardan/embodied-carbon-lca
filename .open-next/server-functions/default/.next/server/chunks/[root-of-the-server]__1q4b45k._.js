module.exports=[70406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},18622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},20635,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/action-async-storage.external.js",()=>require("next/dist/server/app-render/action-async-storage.external.js"))},24725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},56704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},32319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},59043,(e,t,r)=>{t.exports=e.x("next/dist/server/runtime-reacts.external.js",()=>require("next/dist/server/runtime-reacts.external.js"))},93695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},66680,(e,t,r)=>{t.exports=e.x("node:crypto",()=>require("node:crypto"))},81111,(e,t,r)=>{t.exports=e.x("node:stream",()=>require("node:stream"))},73632,e=>{"use strict";var t=e.i(66680),r=e.i(98323);function a(e,t=160){return(e??"").trim().slice(0,t)}async function n(e,a,s={}){if(!process.env.DATABASE_URL)throw Error("DATABASE_URL is not configured.");let i=Math.max(10,Math.trunc(s.limit??120)),o=Math.max(30,Math.trunc(s.windowSeconds??300)),d=process.env.CBAM_RATE_LIMIT_SALT||process.env.CBAM_CRON_SECRET||"cbam-public-rate-limit",p=`${a}|${e.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||e.headers.get("x-real-ip")?.trim()||e.headers.get("cf-connecting-ip")?.trim()||"unknown"}`,u=t.default.createHash("sha256").update(`${d}|${p}`).digest("hex"),c=(0,r.neon)(process.env.DATABASE_URL),x=await c`
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
  `,m=Number(x[0]?.request_count||0),l=Math.max(1,Math.ceil((new Date(x[0]?.window_started_at||Date.now()).getTime()+1e3*o-Date.now())/1e3));return{allowed:m<=i,limit:i,count:m,retryAfter:l,headers:{"X-RateLimit-Limit":String(i),"X-RateLimit-Remaining":String(Math.max(0,i-m)),"Retry-After":String(l)}}}async function s(e,t=256e3){if(Number(e.headers.get("content-length")||0)>t)throw Error("Request body is too large.");let r=await e.text();if(Buffer.byteLength(r,"utf8")>t)throw Error("Request body is too large.");return JSON.parse(r)}e.s(["boundedNumber",0,function(e,t={}){let r=Number(e),a=t.fallback??0;return Number.isFinite(r)?void 0!==t.min&&r<t.min?t.min:void 0!==t.max&&r>t.max?t.max:r:a},"boundedText",0,a,"enforcePublicApiGuard",0,n,"normalizeCnInput",0,function(e){return a(e,24).replace(/\D/g,"")},"readJsonWithLimit",0,s])}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1q4b45k._.js.map