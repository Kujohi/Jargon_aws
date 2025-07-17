import { NextResponse } from 'next/server';

export async function DELETE(request) {
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

    const { deleteAllUserData } = await import('@/services/accumulativeFinancialService');
    await deleteAllUserData(userIdInt);
    
    return NextResponse.json({ success: true, message: 'All user data deleted' });
  } catch (error) {
    console.error('Error in delete user data API:', error);
    return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 });
  }
} 