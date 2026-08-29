import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

export async function GET() {
  // 1. Connect to Neon
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // 2. Fetch the materials
    const query = `
      SELECT 
        m.*,
        alt.material_name as alt_name,
        alt.gwp_mfg as alt_gwp_mfg,
        alt.gwp_con as alt_gwp_con,
        alt.gwp_use as alt_gwp_use,
        alt.gwp_eol as alt_gwp_eol,
        alt.gwp_biogenic as alt_gwp_biogenic
      FROM epd_materials m
      LEFT JOIN epd_materials alt ON m.optimized_alt_id = alt.id
    `;
    
    const { rows } = await pool.query(query);
    
    // 3. Return the data as JSON
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch EPD database' }, { status: 500 });
  } finally {
    await pool.end();
  }
}