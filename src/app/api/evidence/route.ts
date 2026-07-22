import { evidence } from "@/lib/academic-data";
import { apiFailure } from "@/lib/server/api-errors";
import { requireAuthenticatedUserId } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuthenticatedUserId();
    const sources = evidence.filter((item) => item.pathwayId === "ucsd-data" || item.institutionId === "coc");
    return Response.json({ sources, academicDataVersion: "ucsd-data-2026-review-needed" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
