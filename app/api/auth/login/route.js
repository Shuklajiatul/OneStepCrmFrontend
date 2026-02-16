import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Forward the request to your backend for initial login/OTP generation
    const response = await fetch(`${process.env.BACKEND_URL || 'http://10.10.15.194:3001'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();


    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Login failed' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}