import { NextResponse } from "next/server";
import axios from "axios";

const BACKEND_URL = "http://10.10.15.194:3001";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await axios.post(
      `${BACKEND_URL}/api/ssoAuth/callback`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
        withCredentials: true
      }
    );

    console.log("PROXY RESPONSE DATA:", response.data);

    // Create the response
    const nextResponse = NextResponse.json(response.data, {
      status: response.status
    });

    // Map the backend response fields to your expected format
    const { access_token, refresh_token, user, organization, redirectUrl, success } = response.data;

    // Set cookies with the correct field names
    if (access_token) {
      nextResponse.cookies.set('accessToken', access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    if (refresh_token) {
      nextResponse.cookies.set('refreshToken', refresh_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    if (user) {
      nextResponse.cookies.set('user', JSON.stringify(user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    if (organization) {
      nextResponse.cookies.set('organization', JSON.stringify(organization), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    console.log('Cookies set for:', {
      accessToken: !!access_token,
      refreshToken: !!refresh_token,
      user: !!user,
      organization: !!organization
    });

    return nextResponse;

  } catch (err) {
    console.error('Backend proxy error:', err);

    if (err.response) {
      return NextResponse.json(
        { error: err.response.data?.error || 'Backend server error' },
        { status: err.response.status }
      );
    } else if (err.request) {
      return NextResponse.json(
        { error: 'Unable to connect to backend server' },
        { status: 502 }
      );
    } else {
      return NextResponse.json(
        { error: err.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
}