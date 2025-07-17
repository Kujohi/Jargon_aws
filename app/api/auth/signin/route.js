import { NextResponse } from 'next/server';
import { authClient } from '@/services/awsAuthClient';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data, error } = await authClient.signIn(email, password);

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to sign in' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Signed in successfully',
      data 
    });

  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 