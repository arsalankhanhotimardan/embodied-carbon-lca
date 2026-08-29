import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Connect to Neon using your secure Cloudflare Worker environment variable
    const sql = neon(process.env.DATABASE_URL!);
    
    // Fetch live ETS price (order by latest date)
    const priceQuery = await sql`SELECT price_eur FROM eu_ets_pricing ORDER BY updated_at DESC LIMIT 1`;
    const currentEtsPrice = priceQuery.length > 0 ? parseFloat(priceQuery[0].price_eur) : 82.63;

    // Fetch product benchmarks
    const products = await sql`
      SELECT id, name, cn_code as cn, default_ef as "defaultEf", actual_ef as "actualEf" 
      FROM cbam_products 
      ORDER BY name ASC
    `;

    return NextResponse.json({
      success: true,
      etsPrice: currentEtsPrice,
      products: products
    });
  } catch (error) {
    console.error("CBAM Database Error:", error);
    return NextResponse.json({ success: false, message: "Database connection failed" }, { status: 500 });
  }
}