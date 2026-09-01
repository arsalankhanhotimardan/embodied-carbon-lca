#!/usr/bin/env node
const base=(process.env.CBAM_BASE_URL||"http://localhost:3000").replace(/\/$/,"");
const secret=process.env.CBAM_CRON_SECRET;
if(!secret)throw new Error("CBAM_CRON_SECRET is required.");
for(const path of ["/api/cbam/sync-prices","/api/cbam/sync-reference"]){
  const res=await fetch(base+path,{method:"POST",headers:{Authorization:`Bearer ${secret}`}});const body=await res.text();console.log(path,res.status,body.slice(0,4000));if(!res.ok)process.exitCode=1;
}
