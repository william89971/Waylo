"use client";

import { AlertCircle, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationTier } from "@/lib/articulation/types";

export type MatrixCampusColumn = {
  targetMajorId: string;
  label: string;
  isPrimary: boolean;
};

export type MatrixCampusCell = {
  status: "verified" | "review" | "unrequired";
  equivalency?: string;
  verificationTier?: VerificationTier;
};

export type MatrixCourseRow = {
  courseCode: string;
  title: string;
  semesterUnits: number;
  termLabel: string;
  cells: Record<string, MatrixCampusCell>;
};

export type MultiCampusMatrixProps = {
  campuses: MatrixCampusColumn[];
  rows: MatrixCourseRow[];
  selectedCourseCode?: string | null;
  onSelectCourse: (courseCode: string) => void;
};

function StatusGlyph({ cell }: { cell: MatrixCampusCell }) {
  if (cell.status === "unrequired") {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400" title="Not required for this target">
        <Minus className="size-3.5 shrink-0" aria-hidden />
        <span className="sr-only">Not required</span>
      </span>
    );
  }

  if (cell.status === "review") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-amber-600"
        title={cell.verificationTier ?? "Needs counselor review"}
      >
        <AlertCircle className="size-3.5 shrink-0" aria-hidden />
        {cell.equivalency ? (
          <span className="font-mono text-[11px] tabular-nums tracking-tight">{cell.equivalency}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-emerald-700"
      title={cell.verificationTier ?? "Verified"}
    >
      <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      {cell.equivalency ? (
        <span className="font-mono text-[11px] tabular-nums tracking-tight">{cell.equivalency}</span>
      ) : null}
    </span>
  );
}

export function MultiCampusMatrix({
  campuses,
  rows,
  selectedCourseCode,
  onSelectCourse,
}: MultiCampusMatrixProps) {
  return (
    <div className="w-full overflow-x-auto border border-border/40 bg-background" data-testid="articulation-matrix">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Multi-campus articulation matrix. Rows are planned courses; columns are target campuses.
        </caption>
        <thead>
          <tr className="border-b border-border/40">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-background px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
            >
              Course
            </th>
            <th
              scope="col"
              className="px-2 py-2.5 text-right text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
            >
              Units
            </th>
            <th
              scope="col"
              className="px-2 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
            >
              Term
            </th>
            {campuses.map((campus) => (
              <th
                key={campus.targetMajorId}
                scope="col"
                className="px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
              >
                <span className="inline-flex items-baseline gap-1.5">
                  <span className={cn(campus.isPrimary && "text-slate-900")}>{campus.label}</span>
                  {campus.isPrimary ? (
                    <span className="font-mono text-[9px] tracking-wider text-slate-400">PRI</span>
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const selected = selectedCourseCode === row.courseCode;
            return (
              <tr
                key={`${row.termLabel}-${row.courseCode}`}
                data-course-code={row.courseCode}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelectCourse(row.courseCode)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectCourse(row.courseCode);
                  }
                }}
                className={cn(
                  "cursor-pointer border-b border-border/40 outline-none transition-colors duration-150",
                  "hover:bg-muted/30 focus-visible:bg-muted/40",
                  selected && "bg-muted/40",
                )}
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-background px-3 py-2.5 text-left font-normal group-hover:bg-muted/30"
                >
                  <div className="flex min-w-[10rem] flex-col gap-0.5">
                    <span className="font-mono text-[12px] font-medium tabular-nums tracking-tight text-slate-900">
                      {row.courseCode}
                    </span>
                    <span className="max-w-[14rem] truncate text-[11px] text-slate-500">{row.title}</span>
                  </div>
                </th>
                <td className="px-2 py-2.5 text-right font-mono text-[12px] tabular-nums text-slate-700">
                  {row.semesterUnits.toFixed(1)}
                </td>
                <td className="px-2 py-2.5 font-mono text-[11px] tabular-nums text-slate-500">
                  {row.termLabel}
                </td>
                {campuses.map((campus) => {
                  const cell = row.cells[campus.targetMajorId] ?? { status: "unrequired" as const };
                  return (
                    <td key={campus.targetMajorId} className="px-3 py-2.5">
                      <StatusGlyph cell={cell} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
