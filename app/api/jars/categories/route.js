import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { getJarCategories } = await import('@/services/accumulativeFinancialService');
    const categories = await getJarCategories();
    
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error in jar categories API:', error);
    return NextResponse.json({ error: 'Failed to fetch jar categories' }, { status: 500 });
  }
} 