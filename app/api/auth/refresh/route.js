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

    // Set auth cookies directly (server-side – can't use localStorage here)
    const cookieOptions = { path: '/', sameSite: 'lax', httpOnly: false };
    if (data.accessToken) {
      nextResponse.cookies.set('accessToken', data.accessToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24, // 1 day
      });
    }
    if (data.refreshToken) {
      nextResponse.cookies.set('refreshToken', data.refreshToken, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }
    if (data.user?.organization_id) {
      nextResponse.cookies.set('organization_id', data.user.organization_id, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 7, // 7 days
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
