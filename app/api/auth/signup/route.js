import { NextResponse } from 'next/server';
import { authClient } from '@/services/awsAuthClient';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { data, error } = await authClient.signUp(
      email, 
      password,
      { 
        name: name || '',
        given_name: name || ''
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Account created successfully. Please check your email for verification code.',
      data 
    });

  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 