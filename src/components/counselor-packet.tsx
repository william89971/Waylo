import type { VerificationTier } from "@/lib/articulation/types";

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
}: CounselorPacketProps) {
  return (
    <section className="counselor-packet" id="counselor-packet" aria-label="Counselor audit packet">
      <header className="counselor-packet-header">
        <strong>Waylo Counselor Packet</strong>
        <span>Student: {preferredName || "Student"}</span>
      </header>

      <div className="counselor-targets">
        <p>
          <strong>Primary:</strong> {primaryLabel}
        </p>
        <p>
          <strong>Secondaries:</strong>{" "}
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
            <th scope="col">Bucket</th>
          </tr>
        </thead>
        <tbody>
          {scheduleRows.map((row, index) => (
            <tr key={`${row.termLabel}-${row.code}-${index}`}>
              <td>{row.termLabel}</td>
              <td>{row.code}</td>
              <td>{row.title}</td>
              <td>{row.semesterUnits}</td>
              <td>{row.bucket?.replace(/_/g, " ") ?? "—"}</td>
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

      <h2>Evidence citations</h2>
      <table className="counselor-table">
        <thead>
          <tr>
            <th scope="col">Target</th>
            <th scope="col">Requirement key</th>
            <th scope="col">Label</th>
            <th scope="col">VerificationTier</th>
            <th scope="col">Agreement year</th>
            <th scope="col">Source</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {citations.map((citation, index) => (
            <tr key={`${citation.targetLabel}-${citation.requirementKey}-${index}`}>
              <td>{citation.targetLabel}</td>
              <td>{citation.requirementKey}</td>
              <td>{citation.label}</td>
              <td>{citation.verificationTier}</td>
              <td>{citation.effectiveYear}</td>
              <td>{citation.sourceType}</td>
              <td>{citation.satisfied ? "Satisfied / scheduled" : "Open"}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
