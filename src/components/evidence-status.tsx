import { AlertTriangle, CheckCircle2, Compass } from "lucide-react";

export function EvidenceStatus({ state }: { state: "verified" | "suggestion" | "review" }) {
  if (state === "verified") return <span className="evidence-state verified"><CheckCircle2 />Verified COC course</span>;
  if (state === "review") return <span className="evidence-state review"><AlertTriangle />ASSIST confirmation needed</span>;
  return <span className="evidence-state suggestion"><Compass />Planning suggestion</span>;
}
