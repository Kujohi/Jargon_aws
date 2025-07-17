import { NextResponse } from 'next/server';
import { authClient } from '@/services/awsAuthClient';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data, error } = await authClient.resendConfirmationCode(email);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to resend code' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Verification code resent successfully',
      data 
    });

  } catch (error) {
    console.error('Resend code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 