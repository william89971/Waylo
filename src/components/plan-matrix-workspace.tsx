"use client";

import { useCallback, useMemo, useState } from "react";
import {
  EvidenceDrawer,
  type CourseEvidencePayload,
} from "@/components/evidence-drawer";
import {
  MultiCampusMatrix,
  type MatrixCampusColumn,
  type MatrixCourseRow,
} from "@/components/multi-campus-matrix";
import { matrixRowKind } from "@/lib/articulation/matrix-view";

export type PlanMatrixWorkspaceProps = {
  campuses: MatrixCampusColumn[];
  rows: MatrixCourseRow[];
  evidenceByCourseCode: Record<string, CourseEvidencePayload>;
  initialCourseCode?: string | null;
};

type MatrixFilter = "all" | "overlap" | "divergent";

export function PlanMatrixWorkspace({
  campuses,
  rows,
  evidenceByCourseCode,
  initialCourseCode = null,
}: PlanMatrixWorkspaceProps) {
  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(initialCourseCode);
  const [filter, setFilter] = useState<MatrixFilter>("all");
  const evidence = selectedCourseCode ? evidenceByCourseCode[selectedCourseCode] ?? null : null;
  const showFilters = campuses.length > 1;
  const overlapCount = useMemo(
    () => rows.filter((row) => matrixRowKind(row) === "overlap").length,
    [rows],
  );
  const divergentCount = rows.length - overlapCount;
  const visibleRows = useMemo(() => {
    if (!showFilters || filter === "all") return rows;
    return rows.filter((row) => matrixRowKind(row) === filter);
  }, [filter, rows, showFilters]);

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
      {showFilters ? (
        <div className="matrix-filters" role="group" aria-label="Course filters">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All courses ({rows.length})
          </button>
          <button type="button" aria-pressed={filter === "overlap"} onClick={() => setFilter("overlap")}>
            Overlapping only ({overlapCount})
          </button>
          <button type="button" aria-pressed={filter === "divergent"} onClick={() => setFilter("divergent")}>
            Divergent ({divergentCount})
          </button>
        </div>
      ) : null}
      {visibleRows.length ? (
        <MultiCampusMatrix
          campuses={campuses}
          rows={visibleRows}
          selectedCourseCode={selectedCourseCode}
          onSelectCourse={setSelectedCourseCode}
        />
      ) : (
        <p className="matrix-empty">No classes in this view.</p>
      )}
      <EvidenceDrawer
        open={selectedCourseCode !== null}
        evidence={evidence}
        onClose={closeDrawer}
      />
    </>
  );
}
