import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Convert user ID to integer
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Import the function dynamically to ensure it runs server-side only
    const { getAccumulativeDashboardData } = await import('@/services/accumulativeFinancialService');
    const data = await getAccumulativeDashboardData(userIdInt);
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
} 