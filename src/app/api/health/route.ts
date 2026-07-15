import { academicAIProvider, WAYLO_MODEL, XHIGH_LIVE_VERIFIED, XHIGH_SCHEMA_SUPPORTED } from "@/lib/ai/provider";
import { getDemoMode } from "@/lib/ai/live-demo";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    application: "Waylo",
    aiConfigured: academicAIProvider.isConfigured(),
    demoMode: getDemoMode(),
    model: WAYLO_MODEL,
    seededMode: true,
    xhigh: { sdkSchemaSupported: XHIGH_SCHEMA_SUPPORTED, liveVerified: XHIGH_LIVE_VERIFIED, enabled: false },
  });
}
