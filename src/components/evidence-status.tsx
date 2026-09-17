import { BookOpenCheck, CheckCircle2, Compass, ShieldAlert } from "lucide-react";
import type { CourseBucket, VerificationTier } from "@/lib/articulation/types";
import { planBucketLabel } from "@/lib/student-facing-copy";

type LegacyState = "verified" | "suggestion" | "review";

function resolveTier(state?: LegacyState, tier?: VerificationTier): VerificationTier {
  if (tier) return tier;
  if (state === "verified") return "VERIFIED_ASSIST";
  if (state === "review") return "NEEDS_COUNSELOR_CONFIRMATION";
  return "PLANNING_SUGGESTION";
}

export function EvidenceStatus({
  state,
  tier,
}: {
  state?: LegacyState;
  tier?: VerificationTier;
}) {
  const resolved = resolveTier(state, tier);

  if (resolved === "VERIFIED_ASSIST") {
    return <span className="evidence-state verified" title="Listed in an official ASSIST transfer agreement"><CheckCircle2 />Official agreement</span>;
  }
  if (resolved === "VERIFIED_INSTITUTIONAL_GUIDE") {
    return <span className="evidence-state verified" title="Listed in the university’s transfer guide"><BookOpenCheck />University guide</span>;
  }
  if (resolved === "HISTORICAL_PRECEDENT") {
    return <span className="evidence-state suggestion" title="Based on past departmental practice. Confirm with a counselor."><Compass />Past practice — confirm</span>;
  }
  if (resolved === "PLANNING_SUGGESTION") {
    return <span className="evidence-state suggestion" title="Recommended pathway sequence"><Compass />Planning suggestion</span>;
  }
  return <span className="evidence-state review" title="Waylo cannot confirm this yet. Ask a counselor before you enroll."><ShieldAlert />Ask a counselor</span>;
}

export function CourseBucketBadge({
  bucket,
  fulfills,
}: {
  bucket: CourseBucket;
  fulfills: string[];
}) {
  return (
    <span className={`course-bucket ${bucket}`}>
      <strong>{planBucketLabel(bucket)}</strong>
      {fulfills.length ? <small>Counts toward {fulfills.join(", ")}</small> : null}
    </span>
  );
}
