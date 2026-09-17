"use client";

import { cn } from "@/lib/utils";
import type { VerificationTier } from "@/lib/articulation/types";
import { VERIFICATION_SHORT } from "@/lib/student-facing-copy";

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

function MatrixPill({ cell }: { cell: MatrixCampusCell }) {
  if (cell.status === "unrequired") {
    return <span className="matrix-pill unrequired">Not required</span>;
  }
  const title = cell.verificationTier ? VERIFICATION_SHORT[cell.verificationTier] : undefined;
  if (cell.status === "review") {
    return (
      <span className="matrix-pill review" title={title}>
        {cell.equivalency ?? "Ask a counselor"}
      </span>
    );
  }
  return (
    <span className="matrix-pill verified" title={title}>
      {cell.equivalency ?? "Official"}
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
    <div className="max-w-full overflow-hidden [contain:paint]">
      <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain border border-border/40 bg-background" data-testid="articulation-matrix">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[15px]">
        <caption className="sr-only whitespace-normal">
          How each class counts. Select a course row to see why it is on the plan.
        </caption>
        <thead>
          <tr className="border-b border-border/40">
            <th
              scope="col"
              className="sticky left-0 z-10 bg-background px-3 py-3 text-[15px] font-medium text-muted-foreground"
            >
              Course
            </th>
            <th
              scope="col"
              className="px-2 py-3 text-right text-[15px] font-medium text-muted-foreground"
            >
              Units
            </th>
            <th
              scope="col"
              className="px-2 py-3 text-[15px] font-medium text-muted-foreground"
            >
              Term
            </th>
            {campuses.map((campus) => (
              <th
                key={campus.targetMajorId}
                scope="col"
                className="px-3 py-3 text-[15px] font-medium text-muted-foreground"
              >
                <span className="inline-flex items-baseline gap-1.5">
                  <span className={cn(campus.isPrimary && "text-foreground")}>{campus.label}</span>
                  {campus.isPrimary ? (
                    <span className="text-[15px] font-medium text-muted-foreground">First choice</span>
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
                  "group cursor-pointer border-b border-border/40 outline-none",
                  "hover:bg-transparent focus-visible:shadow-[inset_3px_0_0_0_#111111]",
                  selected && "shadow-[inset_3px_0_0_0_#111111]",
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 px-3 py-3.5 text-left font-normal bg-background",
                  )}
                >
                  <div className="flex min-w-[10rem] flex-col gap-0.5">
                    <span className="font-mono text-[16px] font-medium tabular-nums tracking-tight text-foreground">
                      {row.courseCode}
                    </span>
                    <span className="max-w-[16rem] truncate text-[16px] text-muted-foreground">{row.title}</span>
                  </div>
                </th>
                <td className="px-2 py-3.5 text-right font-mono text-[15px] tabular-nums text-foreground">
                  {row.semesterUnits.toFixed(1)}
                </td>
                <td className="px-2 py-3.5 font-mono text-[15px] tabular-nums text-muted-foreground">
                  {row.termLabel}
                </td>
                {campuses.map((campus) => {
                  const cell = row.cells[campus.targetMajorId] ?? { status: "unrequired" as const };
                  return (
                    <td key={campus.targetMajorId} className="px-3 py-3.5">
                      <MatrixPill cell={cell} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
