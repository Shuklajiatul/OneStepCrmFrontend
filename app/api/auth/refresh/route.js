import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const cookies = request.headers.get('cookie');

    // Forward the request to your backend with cookies
    const response = await fetch(`${process.env.BACKEND_URL || 'http://10.10.15.194:3001'}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || '',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || 'Token refresh failed' },
        { status: response.status }
      );
    }

    console.log('Refresh API response data:', {
      accessToken: !!data.accessToken,
      refreshToken: !!data.refreshToken,
      user: !!data.user,
      organization: !!data.organization
    });

    // Create response with new tokens
    const nextResponse = NextResponse.json(data);

    // Set cookies if tokens are returned
    if (data.accessToken) {
      nextResponse.cookies.set('accessToken', data.accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 1 day
      });
    }

    if (data.refreshToken) {
      nextResponse.cookies.set('refreshToken', data.refreshToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
    }

    if (data.user) {
      nextResponse.cookies.set('user', JSON.stringify(data.user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 1 day
      });
    }

    if (data.organization) {
      nextResponse.cookies.set('organization', JSON.stringify(data.organization), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60, // 1 day
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('Refresh API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
