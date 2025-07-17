import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId, monthYear, totalIncomeCents, allocationPercentages } = await request.json();
    
    if (!userId || !monthYear || !totalIncomeCents || !allocationPercentages) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert user ID to integer
    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { addMonthlyIncome } = await import('@/services/accumulativeFinancialService');
    const result = await addMonthlyIncome(userIdInt, monthYear, totalIncomeCents, allocationPercentages);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in income API:', error);
    return NextResponse.json({ error: 'Failed to add income' }, { status: 500 });
  }
} 