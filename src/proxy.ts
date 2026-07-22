import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { assertProductionEnvironment, isClerkConfigured } from "@/lib/server/env";

function isProtectedRoute(request: NextRequest) {
  const path = request.nextUrl.pathname;
  return path === "/onboarding" || path.startsWith("/app") || path.startsWith("/api/me") || path.startsWith("/api/evidence");
}

const configuredProxy = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  assertProductionEnvironment();
  if (!isClerkConfigured()) return NextResponse.next();
  return configuredProxy(request, event);
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
