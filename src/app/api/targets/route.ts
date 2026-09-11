import { listSelectableTargets } from "@/lib/server/production-planning";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { targets: listSelectableTargets() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
