import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { isClerkConfigured, isTestAuthEnabled } from "@/lib/server/env";

export class AuthenticationError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "AuthenticationError";
  }
}

export async function getAuthenticatedUserId() {
  if (isTestAuthEnabled()) {
    const headerStore = await headers();
    const cookieStore = await cookies();
    return headerStore.get("x-waylo-test-user") ?? cookieStore.get("waylo_test_user")?.value ?? null;
  }
  if (!isClerkConfigured()) return null;
  const result = await auth();
  return result.userId;
}

export async function requireAuthenticatedUserId() {
  const userId = await getAuthenticatedUserId();
  if (!userId) throw new AuthenticationError();
  return userId;
}
