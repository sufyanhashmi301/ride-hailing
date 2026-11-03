import { type NextRequest, NextResponse } from "next/server";
import { decodeSessionToken } from "@/lib/jwt";

const ROLE_HOME: Record<string, string> = {
  rider: "/rider",
  driver: "/driver",
  admin: "/admin",
};

const PROTECTED_PREFIXES = ["/rider", "/driver", "/admin"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const role = token ? decodeSessionToken(token)?.role : undefined;
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!role) {
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const home = ROLE_HOME[role] ?? "/login";
  const isOwnRoleArea = pathname.startsWith(home);

  if (pathname === "/" || pathname.startsWith("/login") || (isProtected && !isOwnRoleArea)) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/rider/:path*", "/driver/:path*", "/admin/:path*"],
};
