import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 1. SECURITY: Ensure only your automated GitHub Cron Job can trigger this route
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ success: false, message: 'Unauthorized execution attempt.' }, { status: 401 });
    }

    // 2. FETCH LIVE DATA: 
    // We use a public financial API aggregator for carbon prices. 
    const response = await fetch('https://api.ember-climate.org/v1/carbon-price/latest', {
        next: { revalidate: 0 } // Force a fresh fetch, no caching
    });
    
    if (!response.ok) throw new Error("Failed to fetch live carbon pricing from market API.");
    
    const marketData = await response.json();
    
    // Extract the price
    const newLivePrice = parseFloat(marketData.data[0].price);

    if (isNaN(newLivePrice) || newLivePrice < 10) {
        throw new Error("Invalid price data received.");
    }

    // 3. UPDATE NEON DATABASE
    const sql = neon(process.env.DATABASE_URL!);
    
    // We insert a new row so you have a historical record of all price changes
    await sql`
      INSERT INTO eu_ets_pricing (price_eur) 
      VALUES (${newLivePrice})
    `;

    return NextResponse.json({
      success: true,
      message: `Successfully updated Neon DB. New EU ETS Price: €${newLivePrice}`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}