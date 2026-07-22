import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { assertProductionEnvironment, isClerkConfigured } from "@/lib/server/env";

function isProtectedRoute(request: NextRequest) {
  const path = request.nextUrl.pathname;
  return path === "/onboarding" || path.startsWith("/app") || path.startsWith("/api/me") || path.startsWith("/api/evidence");
}

function requiresProductionServices(request: NextRequest) {
  const path = request.nextUrl.pathname;
  return path !== "/" && path !== "/api/health" && path !== "/service-unavailable" && path !== "/icon.svg";
}

const configuredProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (requiresProductionServices(request)) {
    try {
      assertProductionEnvironment();
    } catch {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        const requestId = crypto.randomUUID();
        return NextResponse.json({ error: { code: "service_unavailable", message: "Waylo account services are not configured for this environment.", requestId, retryable: true } }, { status: 503, headers: { "Cache-Control": "no-store", "X-Waylo-Request-Id": requestId } });
      }
      return NextResponse.redirect(new URL("/service-unavailable", request.url));
    }
  }
  if (!isClerkConfigured()) return NextResponse.next();
  return configuredProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
