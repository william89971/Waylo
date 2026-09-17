import type { AdmissionsStrategy } from "@/lib/admissions-strategy";
import type { ArticulationSourceType, VerificationTier } from "@/lib/articulation/types";
import { planBucketLabel, SOURCE_TYPE_LABEL, VERIFICATION_SHORT } from "@/lib/student-facing-copy";

export interface CounselorCitation {
  targetLabel: string;
  requirementKey: string;
  label: string;
  verificationTier: VerificationTier;
  effectiveYear: string;
  sourceType: string;
  satisfied: boolean;
}

export interface CounselorScheduleRow {
  termLabel: string;
  code: string;
  title: string;
  semesterUnits: number;
  bucket?: string;
}

export interface CounselorPacketProps {
  preferredName: string;
  primaryLabel: string;
  secondaryLabels: string[];
  scheduleRows: CounselorScheduleRow[];
  totalSemesterUnits: number;
  citations: CounselorCitation[];
  academicDataVersion: string;
  algorithmVersion?: string;
  evaluatedAt?: string;
  strategy?: AdmissionsStrategy | null;
}

/**
 * Print-ready counselor audit summary: targets, COC semester schedule,
 * evidence citation table, and advisory disclaimer.
 */
export function CounselorPacket({
  preferredName,
  primaryLabel,
  secondaryLabels,
  scheduleRows,
  totalSemesterUnits,
  citations,
  academicDataVersion,
  algorithmVersion,
  evaluatedAt,
  strategy,
}: CounselorPacketProps) {
  return (
    <section className="counselor-packet" id="counselor-packet" aria-label="Counselor audit packet">
      <header className="counselor-packet-header">
        <strong>Take this to your counselor</strong>
        <span>Student: {preferredName || "Student"}</span>
        <span>College of the Canyons transfer plan</span>
      </header>

      <div className="counselor-targets">
        <p>
          <strong>First choice:</strong> {primaryLabel}
        </p>
        <p>
          <strong>Also considering:</strong>{" "}
          {secondaryLabels.length ? secondaryLabels.join(", ") : "None"}
        </p>
      </div>

      <h2>Semester-by-semester plan (COC units)</h2>
      <table className="counselor-table">
        <thead>
          <tr>
            <th scope="col">Term</th>
            <th scope="col">Course</th>
            <th scope="col">Title</th>
            <th scope="col">COC units</th>
            <th scope="col">Why it is on the plan</th>
          </tr>
        </thead>
        <tbody>
          {scheduleRows.map((row, index) => (
            <tr key={`${row.termLabel}-${row.code}-${index}`}>
              <td>{row.termLabel}</td>
              <td>{row.code}</td>
              <td>{row.title}</td>
              <td>{row.semesterUnits}</td>
              <td>{planBucketLabel(row.bucket)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Total planned</td>
            <td colSpan={2}>{totalSemesterUnits} semester units</td>
          </tr>
        </tfoot>
      </table>

      <h2>What is official, and what to confirm</h2>
      <table className="counselor-table">
        <thead>
          <tr>
            <th scope="col">School</th>
            <th scope="col">Requirement</th>
            <th scope="col">Status</th>
            <th scope="col">Agreement year</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {citations.map((citation, index) => (
            <tr key={`${citation.targetLabel}-${citation.requirementKey}-${index}`}>
              <td>{citation.targetLabel}</td>
              <td>{citation.label}</td>
              <td>
                {citation.satisfied ? "On the plan · " : "Still open · "}
                {VERIFICATION_SHORT[citation.verificationTier]}
              </td>
              <td>{citation.effectiveYear}</td>
              <td>
                {SOURCE_TYPE_LABEL[citation.sourceType as ArticulationSourceType] ??
                  citation.sourceType.replaceAll("_", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {strategy ? (
        <div className="counselor-strategy">
          <h2>What to ask your counselor</h2>
          <ol>
            {strategy.counselor.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p>
            <strong>{strategy.grades.title}.</strong> {strategy.grades.body}
          </p>
          <p>{strategy.disclaimer}</p>
        </div>
      ) : null}

      <p className="counselor-meta">
        Release: {academicDataVersion}
        {algorithmVersion ? ` · Algorithm: ${algorithmVersion}` : ""}
        {evaluatedAt ? ` · Evaluated: ${evaluatedAt}` : ""}
      </p>
      <p className="counselor-disclaimer">
        Planning aid generated via Waylo. Not an official transcript, articulation agreement, or admission guarantee.
        Requires College of the Canyons counselor validation.
      </p>
    </section>
  );
}
