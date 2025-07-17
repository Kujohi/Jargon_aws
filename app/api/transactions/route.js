import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const jarCategoryId = searchParams.get('jarCategoryId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    if (isNaN(userIdInt)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { getUserTransactions } = await import('@/services/accumulativeFinancialService');
    
    // Build filter options
    const filterOptions = {};
    
    // Only set limit if specified, otherwise get all transactions
    if (limit !== null && limit !== 'all') {
      filterOptions.limit = parseInt(limit) || 100;
    }
    
    if (jarCategoryId && jarCategoryId !== 'all') {
      filterOptions.jarCategoryId = parseInt(jarCategoryId);
    }
    
    // Handle search - convert to searchKeywords array
    if (search) {
      filterOptions.searchKeywords = [search];
    }

    let transactions = await getUserTransactions(userIdInt, filterOptions);
    
    // Apply type filter if specified
    if (type && type !== 'all') {
      if (type === 'expense') {
        transactions = transactions.filter(t => t.amount_cents < 0);
      } else if (type === 'income') {
        transactions = transactions.filter(t => t.amount_cents > 0);
      }
    }
    
    // Transform transactions to match frontend expectations
    const transformedTransactions = transactions.map(transaction => ({
      ...transaction,
      jar_category: {
        name: transaction.category_name,
        id: transaction.jar_category_id
      }
    }));
    
    return NextResponse.json({ transactions: transformedTransactions });
  } catch (error) {
    console.error('Error in transactions GET API:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, jarCategoryId, amountCents, description, source = 'manual' } = await request.json();
    
    if (!userId || !jarCategoryId || amountCents === undefined || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userIdInt = parseInt(userId);
    const jarCategoryIdInt = parseInt(jarCategoryId);
    const amountCentsInt = parseInt(amountCents);
    
    if (isNaN(userIdInt) || isNaN(jarCategoryIdInt) || isNaN(amountCentsInt)) {
      return NextResponse.json({ error: 'Invalid numeric values' }, { status: 400 });
    }

    const { addTransaction } = await import('@/services/accumulativeFinancialService');
    const result = await addTransaction(userIdInt, jarCategoryIdInt, amountCentsInt, description, source);
    
    return NextResponse.json({ success: true, transaction: result });
  } catch (error) {
    console.error('Error in transactions POST API:', error);
    return NextResponse.json({ error: 'Failed to add transaction' }, { status: 500 });
  }
} 