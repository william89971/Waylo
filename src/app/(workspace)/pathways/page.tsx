"use client";

import { ArrowRight, BookOpenCheck, Building2 } from "lucide-react";
import { PageHeader, Tag } from "@/components/ui";
import { programs } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";

export default function PathwaysPage() {
  const selected = useWorkspaceStore((state) => state.workspace.profile.selectedPathwayId);
  const selectPathway = useWorkspaceStore((state) => state.selectPathway);
  return (
    <div className="page">
      <PageHeader title="Explore your academic routes." subtitle="Compare six deeply supported university-program pathways across three destination universities." />
      <div className="stack">
        {(["cognitive-science", "data-science"] as const).map((family) => (
          <section className="panel pathway-group" key={family}>
            <header className="pathway-group-header"><div className="cluster">{family === "cognitive-science" ? <BookOpenCheck color="var(--purple)" /> : <Building2 color="var(--teal)" />}<div><h2 className="section-title">{family === "cognitive-science" ? "Cognitive Science" : "Data Science"}</h2><p className="section-copy">{family === "cognitive-science" ? "Greater psychology, research, and cognition overlap." : "Longer mathematics and programming prerequisite chains."}</p></div></div><Tag tone={family === "cognitive-science" ? "purple" : "teal"}>3 universities</Tag></header>
            <div className="pathway-list">
              {programs.filter((program) => program.family === family).map((program) => (
                <div className="pathway-row" key={program.id}>
                  <div><div className="university">{program.universityName}</div><div className="degree">Destination university</div></div>
                  <div><strong>{program.name} {program.degree}</strong><div className="degree">{program.requirements.length} modeled preparation groups · evidence attached</div></div>
                  <button className={`button small ${selected === program.id ? "primary" : ""}`} type="button" onClick={() => selectPathway(program.id)}>{selected === program.id ? "Selected" : "Choose pathway"}<ArrowRight size={14} /></button>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="title-row"><p className="section-copy">Coverage is intentionally limited. Waylo does not extrapolate to unsupported programs.</p><a className="button primary" href="/roadmap">Build selected route <ArrowRight size={16} /></a></div>
      </div>
    </div>
  );
}
