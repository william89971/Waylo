import Link from "next/link";
import { ExternalLink, FileCheck2 } from "lucide-react";
import { PageHeader, Status } from "@/components/ui";
import { evidence } from "@/lib/academic-data";

export default function EvidencePage() {
  return <div className="page"><PageHeader title="Evidence behind your route" subtitle="Every academic fact carries a source, effective year, retrieval date, and verification status." /><section className="panel">{evidence.map((item) => <article className="evidence-row" key={item.id}><div><div className="cluster"><FileCheck2 size={18} color="var(--blue)" /><span className="evidence-title">{item.title}</span></div><div className="evidence-note">{item.note}</div></div><div><strong style={{ fontSize: 12 }}>Effective</strong><div className="evidence-note">{item.effectiveYear}</div></div><Status tone={item.status === "verified" ? "confirmed" : item.status === "partial" ? "warning" : "blocker"} label={item.status} /><div className="cluster"><Link href={`/evidence/${item.id}`} className="button small">Details</Link><a className="icon-button" href={item.url} target="_blank" rel="noreferrer" aria-label={`Open source: ${item.title}`}><ExternalLink size={16} /></a></div></article>)}</section><p className="section-copy" style={{ marginTop: 14 }}>Partial or uncertain evidence never silently satisfies a route requirement. Confirm current articulation agreements in ASSIST and review the plan with a counselor.</p></div>;
}
