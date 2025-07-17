import { NextResponse } from 'next/server';
import { authClient } from '@/services/awsAuthClient';

export async function POST(request) {
  try {
    const { email, confirmationCode } = await request.json();

    if (!email || !confirmationCode) {
      return NextResponse.json({ error: 'Email and confirmation code are required' }, { status: 400 });
    }

    const { data, error } = await authClient.confirmSignUp(email, confirmationCode);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to confirm account' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Account confirmed successfully. You can now sign in.',
      data 
    });

  } catch (error) {
    console.error('Confirm sign up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 