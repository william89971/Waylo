"use client";

import { useEffect, type ReactNode } from "react";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticulationSourceType, VerificationTier } from "@/lib/articulation/types";

export type EvidenceCampusEntry = {
  targetMajorId: string;
  campusLabel: string;
  isPrimary: boolean;
  required: boolean;
  destinationRequirement?: string;
  verificationTier?: VerificationTier;
  sourceType?: ArticulationSourceType;
  sourceUrl?: string;
  agreementYear?: string;
  notes?: string;
};

export type CourseEvidencePayload = {
  courseCode: string;
  courseTitle: string;
  semesterUnits: number;
  campuses: EvidenceCampusEntry[];
};

export type EvidenceDrawerProps = {
  open: boolean;
  evidence: CourseEvidencePayload | null;
  onClose: () => void;
};

const TIER_COPY: Record<VerificationTier, string> = {
  VERIFIED_ASSIST: "VERIFIED_ASSIST",
  VERIFIED_INSTITUTIONAL_GUIDE: "VERIFIED_INSTITUTIONAL_GUIDE",
  HISTORICAL_PRECEDENT: "HISTORICAL_PRECEDENT",
  PLANNING_SUGGESTION: "PLANNING_SUGGESTION",
  NEEDS_COUNSELOR_CONFIRMATION: "NEEDS_COUNSELOR_CONFIRMATION",
};

const TIER_EXPLAIN: Record<VerificationTier, string> = {
  VERIFIED_ASSIST: "Confirmed in an official ASSIST agreement.",
  VERIFIED_INSTITUTIONAL_GUIDE: "Confirmed in the university’s transfer guide.",
  HISTORICAL_PRECEDENT: "Based on past departmental practice — confirm with a counselor.",
  PLANNING_SUGGESTION: "A planning recommendation, not a verified articulation.",
  NEEDS_COUNSELOR_CONFIRMATION: "Uncertain. Ask a counselor before you enroll.",
};

const SOURCE_LABELS: Record<ArticulationSourceType, string> = {
  assist_public: "ASSIST public articulation",
  institutional_guide: "Institutional transfer guide",
  departmental_precedent: "Departmental precedent",
};

function LedgerRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] gap-3 border-b border-border/40 py-2.5 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</dt>
      <dd className="text-right text-[13px] leading-snug text-slate-900">{value}</dd>
    </div>
  );
}

function tierTone(tier: VerificationTier | undefined): string {
  if (!tier) return "border-border/40 bg-muted/40 text-slate-700";
  if (tier === "VERIFIED_ASSIST" || tier === "VERIFIED_INSTITUTIONAL_GUIDE") {
    return "border-emerald-700/30 bg-emerald-50 text-emerald-900";
  }
  if (tier === "NEEDS_COUNSELOR_CONFIRMATION" || tier === "PLANNING_SUGGESTION") {
    return "border-amber-700/30 bg-amber-50 text-amber-950";
  }
  return "border-border/40 bg-muted/50 text-slate-800";
}

export function EvidenceDrawer({ open, evidence, onClose }: EvidenceDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const primary = evidence?.campuses.find((campus) => campus.isPrimary && campus.required);
  const headlineTier = primary?.verificationTier;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 no-print",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
      data-testid="evidence-drawer-root" data-state={open ? "open" : "closed"}
    >
      <button
        type="button"
        aria-label="Dismiss evidence drawer"
        className={cn(
          "absolute inset-0 bg-background/60 backdrop-blur-xs transition-opacity duration-200 ease-out",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={evidence ? `Evidence for ${evidence.courseCode}` : "Course evidence"}
        data-testid="evidence-drawer" data-state={open ? "open" : "closed"}
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(100%-0.75rem,28rem)] max-w-md flex-col border-l border-border/40 bg-white",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
          !open && "invisible",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/40 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Articulation evidence
            </p>
            {evidence ? (
              <>
                <h2 className="mt-1 font-mono text-lg font-medium tabular-nums tracking-tight text-slate-900">
                  {evidence.courseCode}
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-600">{evidence.courseTitle}</p>
              </>
            ) : (
              <h2 className="mt-1 text-lg font-medium text-slate-900">No course selected</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center text-slate-500 hover:bg-muted/50 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {evidence ? (
            <div className="space-y-6">
              <div className={cn("border px-3 py-2.5", tierTone(headlineTier))}>
                <p className="text-[14px] font-medium leading-snug tracking-normal normal-case">
                  {headlineTier ? TIER_EXPLAIN[headlineTier] : "This course is not required by the first-choice campus."}
                </p>
                <p className="mt-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em]">
                  {headlineTier ? TIER_COPY[headlineTier] : "NO PRIMARY ARTICULATION"}
                </p>
              </div>

              <dl>
                <LedgerRow
                  label="Source course"
                  value={
                    <span className="font-mono tabular-nums">
                      {evidence.courseCode} · {evidence.semesterUnits.toFixed(1)} u
                    </span>
                  }
                />
              </dl>

              {evidence.campuses.map((campus) => (
                <section key={campus.targetMajorId} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 border-b border-border/40 pb-2">
                    <h3 className="text-[13px] font-medium text-slate-900">{campus.campusLabel}</h3>
                    {campus.isPrimary ? (
                      <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">First choice</span>
                    ) : null}
                  </div>

                  {!campus.required ? (
                    <p className="py-3 text-[13px] text-slate-500">Not required for this target.</p>
                  ) : (
                    <dl>
                      <LedgerRow
                        label="TARGET INSTITUTION"
                        value={campus.campusLabel}
                      />
                      <LedgerRow
                        label="DESTINATION REQUIREMENT"
                        value={
                          campus.destinationRequirement ? (
                            <span className="font-mono text-[12px] tabular-nums">
                              {campus.destinationRequirement}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <LedgerRow
                        label="Verification tier"
                        value={
                          campus.verificationTier ? (
                            <span className="font-mono text-[11px] tracking-tight">
                              {TIER_COPY[campus.verificationTier]}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <LedgerRow
                        label="Agreement year"
                        value={
                          campus.agreementYear ? (
                            <span className="font-mono tabular-nums">{campus.agreementYear}</span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <LedgerRow
                        label="Source repository"
                        value={campus.sourceType ? SOURCE_LABELS[campus.sourceType] : "—"}
                      />
                      {campus.notes ? <LedgerRow label="Notes" value={campus.notes} /> : null}
                    </dl>
                  )}

                  {campus.required && campus.sourceUrl ? (
                    <a
                      href={campus.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 border border-border/40 px-3 text-[12px] font-medium text-slate-800 hover:bg-muted/40"
                    >
                      View official source
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : null}
                </section>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a course row in the matrix to inspect evidence.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
