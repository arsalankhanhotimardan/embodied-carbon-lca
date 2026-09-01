#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is not configured.");
const sql=neon(process.env.DATABASE_URL);
const old=await sql`DELETE FROM cbam_api_rate_limits WHERE updated_at < NOW() - INTERVAL '2 days' RETURNING bucket_key`;
const staleRuns=await sql`UPDATE cbam_reference_sync_runs SET status='failed',finished_at=NOW(),error=COALESCE(error,'Marked stale by maintenance task') WHERE status='running' AND started_at < NOW() - INTERVAL '6 hours' RETURNING id`;
console.log(JSON.stringify({success:true,rateLimitBucketsDeleted:old.length,staleSyncRunsClosed:staleRuns.length},null,2));
