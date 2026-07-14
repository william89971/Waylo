"use client";

import { AcademicTwinWorkspace } from "@/components/academic-twin-workspace";
import { PageHeader } from "@/components/ui";

export default function RoadmapPage() {
  return (
    <div className="page twin-page">
      <PageHeader title="Your Academic Twin" subtitle="Explore the dependency route, test a detour, inspect rejected candidates, and confirm only after the deterministic validator passes." />
      <AcademicTwinWorkspace />
    </div>
  );
}
