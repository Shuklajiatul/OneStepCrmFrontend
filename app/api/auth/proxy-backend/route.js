import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://10.10.15.194:3001";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/ssoAuth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("PROXY RESPONSE DATA:", data);

    // Create the response
    const nextResponse = NextResponse.json(data, {
      status: response.status,
    });

    // Map the backend response fields to your expected format
    const { access_token, refresh_token, user, organization, redirectUrl, success } = data;

    // Set cookies with the correct field names
    if (access_token) {
      nextResponse.cookies.set("accessToken", access_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
    }

    if (refresh_token) {
      nextResponse.cookies.set("refreshToken", refresh_token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
    }

    if (user) {
      nextResponse.cookies.set("user", JSON.stringify(user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
    }

    if (organization) {
      nextResponse.cookies.set("organization", JSON.stringify(organization), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });
    }

    console.log("Cookies set for:", {
      accessToken: !!access_token,
      refreshToken: !!refresh_token,
      user: !!user,
      organization: !!organization,
    });

    return nextResponse;
  } catch (err) {
    console.error("Backend proxy error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}