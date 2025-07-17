import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Convert user ID to integer
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Import the function dynamically to ensure it runs server-side only
    const { checkUserAccumulativeSetup } = await import('@/services/accumulativeFinancialService');
    const result = await checkUserAccumulativeSetup(userIdInt);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in jars setup API:', error);
    return NextResponse.json({ error: 'Failed to setup jars' }, { status: 500 });
  }
} 