import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search');

  if (!searchQuery) {
    return NextResponse.json({ success: false, error: 'Search query required' }, { status: 400 });
  }

  try {
    // Ping the official EC3 Global EPD Database directly using your persistent API key
    const ec3Response = await fetch(`https://buildingtransparency.org/api/materials?name__like=${searchQuery}&page_size=20`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.EC3_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!ec3Response.ok) {
        const errText = await ec3Response.text();
        console.error("EC3 Rejection:", errText);
        throw new Error('Failed to fetch from EC3 Materials API');
    }

    const data = await ec3Response.json();

    // Map the complex EC3 architecture into our clean Engine format
    const mappedResults = data.map((epd: any) => ({
      name: epd.name || 'Unknown Material',
      manufacturer: epd.manufacturer?.name || 'Generic',
      category: epd.category?.name || 'Div 10-49: Other',
      declared_unit: epd.declared_unit?.name || 'kg',
      gwp: epd.gwp?.value || 0,
      traci_acidification: epd.impacts?.acidification?.value || 0,
      traci_smog: epd.impacts?.smog?.value || 0,
    }));

    return NextResponse.json({ success: true, data: mappedResults });
    
  } catch (error) {
    console.error('EC3 API Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to connect to global database' }, { status: 500 });
  }
}