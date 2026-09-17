"use client";

import { useCallback, useState } from "react";
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
  initialCourseCode?: string | null;
};

export function PlanMatrixWorkspace({
  campuses,
  rows,
  evidenceByCourseCode,
  initialCourseCode = null,
}: PlanMatrixWorkspaceProps) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(initialCourseCode);
  const evidence = selectedCourseCode ? evidenceByCourseCode[selectedCourseCode] ?? null : null;

  const closeDrawer = useCallback(() => {
    const code = selectedCourseCode;
    setSelectedCourseCode(null);
    if (!code) return;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-testid="articulation-matrix"] tr[data-course-code="${CSS.escape(code)}"]`,
        )
        ?.focus();
    });
  }, [selectedCourseCode]);

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
        onClose={closeDrawer}
      />
    </>
  );
}
