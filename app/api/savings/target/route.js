import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { getUserSavingTarget } = await import('@/services/accumulativeFinancialService');
    const target = await getUserSavingTarget(userIdInt);
    
    return NextResponse.json({ target });
  } catch (error) {
    console.error('Error in savings target GET API:', error);
    return NextResponse.json({ error: 'Failed to fetch savings target' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, targetAmountCents } = await request.json();
    
    if (!userId || targetAmountCents === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    const targetAmountCentsInt = parseInt(targetAmountCents);
    
    if (isNaN(userIdInt) || isNaN(targetAmountCentsInt)) {
      return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 });
    }

    const { setSavingTarget } = await import('@/services/accumulativeFinancialService');
    const result = await setSavingTarget(userIdInt, targetAmountCentsInt);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in savings target POST API:', error);
    return NextResponse.json({ error: 'Failed to set savings target' }, { status: 500 });
  }
} 