import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader, Status } from "@/components/ui";
import { evidenceById } from "@/lib/academic-data";

export default async function EvidenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const item = evidenceById.get(id); if (!item) notFound();
  return <div className="page"><PageHeader title={item.title} subtitle="Source detail and verification boundary" action={<Link className="button" href="/evidence"><ArrowLeft size={16} />All evidence</Link>} /><div className="split"><section className="panel" style={{ padding: 24 }}><dl style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: "14px 18px", margin: 0 }}><dt>Status</dt><dd><Status tone={item.status === "verified" ? "confirmed" : item.status === "partial" ? "warning" : "blocker"} label={item.status} /></dd><dt>Effective year</dt><dd>{item.effectiveYear}</dd><dt>Retrieved</dt><dd>{item.retrievedAt}</dd><dt>Provenance</dt><dd>{item.provenance.replaceAll("_", " ")}</dd><dt>Institution</dt><dd>{item.institutionId}</dd><dt>Pathway</dt><dd>{item.pathwayId ?? "Shared source"}</dd></dl><a href={item.url} target="_blank" rel="noreferrer" className="button primary" style={{ marginTop: 22 }}>Open official source <ExternalLink size={16} /></a></section><aside className={`callout ${item.status === "verified" ? "info" : "warning"}`}><h2 className="section-title">How Waylo uses this</h2><p>{item.note}</p><p>Source metadata supports transparency. It does not convert an unconfirmed course equivalency into a verified articulation.</p></aside></div></div>;
}
