import { buildJudgeSnapshot } from "@/lib/judge-snapshot";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(buildJudgeSnapshot(), {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
