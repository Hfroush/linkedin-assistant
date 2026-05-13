import { NextRequest, NextResponse } from "next/server";

const BASIC_AUTH_REALM = "LinkedIn Assistant";

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${BASIC_AUTH_REALM}", charset="UTF-8"`,
    },
  });
}

function parseBasicAuth(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLength = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < maxLength; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

export function middleware(request: NextRequest): NextResponse {
  const expectedUsername = process.env.APP_BASIC_AUTH_USERNAME;
  const expectedPassword = process.env.APP_BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("App access is not configured", { status: 500 });
    }

    return NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));

  if (
    !credentials ||
    !timingSafeEqual(credentials.username, expectedUsername) ||
    !timingSafeEqual(credentials.password, expectedPassword)
  ) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
