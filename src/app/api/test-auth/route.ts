import { cookies } from "next/headers";
import { z } from "zod";
import { isTestAuthEnabled } from "@/lib/server/env";

const TestSessionSchema = z.object({ testUser: z.string().regex(/^test-[a-z0-9-]{1,64}$/) });

export async function POST(request: Request) {
  if (!isTestAuthEnabled()) return Response.json({ error: "not_found" }, { status: 404 });
  const parsed = TestSessionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_test_session" }, { status: 400 });
  const store = await cookies();
  store.set("waylo_test_user", parsed.data.testUser, { httpOnly: true, sameSite: "lax", path: "/", secure: false });
  return Response.json({ ok: true });
}

export async function DELETE() {
  if (!isTestAuthEnabled()) return Response.json({ error: "not_found" }, { status: 404 });
  const store = await cookies();
  store.delete("waylo_test_user");
  return Response.json({ ok: true });
}
