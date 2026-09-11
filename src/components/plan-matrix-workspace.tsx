"use client";

import { useState } from "react";
import {
  EvidenceDrawer,
  type CourseEvidencePayload,
} from "@/components/evidence-drawer";
import {
  MultiCampusMatrix,
  type MatrixCampusColumn,
  type MatrixCourseRow,
} from "@/components/multi-campus-matrix";

export type PlanMatrixWorkspaceProps = {
  campuses: MatrixCampusColumn[];
  rows: MatrixCourseRow[];
  evidenceByCourseCode: Record<string, CourseEvidencePayload>;
};

export function PlanMatrixWorkspace({
  campuses,
  rows,
  evidenceByCourseCode,
}: PlanMatrixWorkspaceProps) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null);
  const evidence = selectedCourseCode ? evidenceByCourseCode[selectedCourseCode] ?? null : null;

  return (
    <>
      <MultiCampusMatrix
        campuses={campuses}
        rows={rows}
        selectedCourseCode={selectedCourseCode}
        onSelectCourse={setSelectedCourseCode}
      />
      <EvidenceDrawer
        open={selectedCourseCode !== null}
        evidence={evidence}
        onClose={() => setSelectedCourseCode(null)}
      />
    </>
  );
}
