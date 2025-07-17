import { NextResponse } from 'next/server';
import { authClient } from '@/services/awsAuthClient';
import { dbClient, initializeUserJars } from '@/lib/serverOnly';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await authClient.getUser(token);
    
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user from database
    const { data: userData, error: dbError } = await dbClient.select('users', {
      where: { email: user.email }
    });

    if (dbError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!userData || userData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: userData[0] });

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user: authUser } = await request.json();
    
    if (!authUser || !authUser.email) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUsers, error: selectError } = await dbClient.select('users', {
      where: { email: authUser.email }
    });

    if (selectError) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ user: existingUsers[0] });
    }

    // Create new user
    const { data: newUser, error: insertError } = await dbClient.insert('users', {
      full_name: authUser.user_metadata?.name || authUser.user_metadata?.full_name,
      email: authUser.email,
    }, { returning: '*' });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Initialize jars for new user
    try {
      await initializeUserJars(newUser[0].id);
    } catch (error) {
      console.error('Error initializing jars:', error);
    }

    return NextResponse.json({ user: newUser[0] });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 