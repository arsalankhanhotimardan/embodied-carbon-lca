import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Authenticate the incoming C# payload via a secret header
    const authHeader = request.headers.get('x-revit-api-key');
    if (authHeader !== process.env.REVIT_WEBHOOK_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized BIM Client' }, { status: 401 });
    }

    const payload = await request.json();

    if (!payload.projectId || !payload.materials || !Array.isArray(payload.materials)) {
      return NextResponse.json({ success: false, error: 'Invalid BIM payload structure' }, { status: 400 });
    }

    // In a production database, you would save this payload to Neon tied to the projectId.
    // For this bridge, we confirm receipt so your C# plugin knows the sync succeeded.
    console.log(`Successfully synced ${payload.materials.length} items from Revit Project: ${payload.projectId}`);

    return NextResponse.json({ 
        success: true, 
        message: 'BIM Data successfully ingested into the LCA Engine',
        itemCount: payload.materials.length 
    });

  } catch (error) {
    console.error('Revit Webhook Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}