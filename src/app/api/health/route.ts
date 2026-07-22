import { isClerkConfigured, isDatabaseConfigured } from "@/lib/server/env";
import { UCSD_DATA_RELEASE } from "@/lib/server/production-planning";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    application: "Waylo",
    authentication: isClerkConfigured() ? "configured" : "unconfigured",
    database: isDatabaseConfigured() ? "configured" : "unconfigured",
    academicDataVersion: UCSD_DATA_RELEASE,
  }, { headers: { "Cache-Control": "no-store" } });
}
