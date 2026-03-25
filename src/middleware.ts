import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

const buckets = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b || now > b.reset) {
    b = { count: 0, reset: now + WINDOW_MS };
    buckets.set(ip, b);
  }
  b.count += 1;
  return b.count <= MAX_REQUESTS;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}

function isPublicApiRoute(req: NextRequest): boolean {
  const p = req.nextUrl.pathname;
  const m = req.method;
  if (p === "/api/coverage-check" && m === "POST") return true;
  if (p === "/api/coverage-check/vaccines" && m === "GET") return true;
  return false;
}

export function middleware(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN;
  if (token && !isPublicApiRoute(req)) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${token}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
