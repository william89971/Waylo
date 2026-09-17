import Link from "next/link";
import { redirect } from "next/navigation";
import { evidence } from "@/lib/academic-data";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { isAdminUserId } from "@/lib/server/env";
import { UCSD_DATA_RELEASE, WAYLO_ALGORITHM_VERSION } from "@/lib/server/production-planning";

export const dynamic = "force-dynamic";

export default async function InternalPage() {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/app");
  const reviewItems = evidence.filter((source) => (source.pathwayId === "ucsd-data" || source.institutionId === "coc") && source.status !== "verified").length;
  return <main className="production-page"><header className="production-page-header"><h1>Waylo internal operations</h1><p>Restricted product diagnostics. No student profile or transcript content is shown here.</p></header><div className="dashboard-rail"><section><h2>Build</h2><strong>Phase 1</strong><span>Production conversion</span></section><section><h2>Planning engine</h2><strong>{WAYLO_ALGORITHM_VERSION}</strong><span>Deterministic server execution</span></section><section className={reviewItems ? "rail-review" : ""}><h2>Academic data</h2><strong>{reviewItems}</strong><span>UCSD/COC source records need confirmation</span></section><section><h2>Release</h2><strong>{UCSD_DATA_RELEASE}</strong><span>Human academic review not yet recorded</span></section></div><div className="dashboard-actions"><Link className="production-button" href="/overview">Internal only: legacy diagnostic workspace</Link><Link className="production-button" href="/api/health">Open sanitized health</Link><Link className="production-button primary" href="/app">Return to student dashboard</Link></div></main>;
}
