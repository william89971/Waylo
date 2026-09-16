"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { isPreferredTransferTerm } from "@/lib/admissions-strategy";
import type { CourseDefinition } from "@/lib/domain";
import type { ProductionCourse, SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

const STEP_LABELS = ["Academic history", "Transfer goal", "Completed courses", "Preferences"];

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Waylo could not save that change.");
  return body;
}

function buildInitialMajorMap(targets: SelectableTarget[], initial: StudentWorkspaceRecord) {
  const map: Record<string, string> = {};
  const primary = targets.find((target) => target.id === initial.primaryTargetId);
  if (primary) map[primary.institutionId] = primary.id;
  for (const secondaryId of initial.secondaryTargetIds ?? []) {
    const secondary = targets.find((target) => target.id === secondaryId);
    if (secondary) map[secondary.institutionId] = secondary.id;
  }
  return map;
}

export function OnboardingFlow({
  initial,
  catalog,
  targets = [],
  startStep,
  editing = false,
}: {
  initial: StudentWorkspaceRecord;
  catalog: CourseDefinition[];
  targets?: SelectableTarget[];
  startStep?: number;
  editing?: boolean;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [workspace, setWorkspace] = useState(initial);
  const [step, setStep] = useState(
    startStep ?? (initial.profile.onboardingCompleted ? 4 : initial.profile.onboardingStep),
  );
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(catalog[0]?.id ?? "");
  const [term, setTerm] = useState("Fall 2026");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState<"completed" | "in_progress">("completed");
  const [maxUnits, setMaxUnits] = useState(initial.preferences.maxUnits);
  const [summerEnrollment, setSummerEnrollment] = useState(initial.preferences.summerEnrollment);
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(initial.preferences.weeklyWorkHours);
  const [targetTerm, setTargetTerm] = useState(initial.preferences.targetTerm ?? "");
  const [includeSecondaryDivergence, setIncludeSecondaryDivergence] = useState(initial.includeSecondaryDivergence ?? true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const institutions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const target of targets) {
      if (!seen.has(target.institutionId)) seen.set(target.institutionId, target.institutionName);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [targets]);

  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>(() => {
    const ids = new Set<string>();
    const primary = targets.find((target) => target.id === initial.primaryTargetId);
    if (primary) ids.add(primary.institutionId);
    for (const secondaryId of initial.secondaryTargetIds ?? []) {
      const secondary = targets.find((target) => target.id === secondaryId);
      if (secondary) ids.add(secondary.institutionId);
    }
    return [...ids];
  });
  const [majorByInstitution, setMajorByInstitution] = useState<Record<string, string>>(() =>
    buildInitialMajorMap(targets, initial),
  );
  const [primaryInstitutionId, setPrimaryInstitutionId] = useState(() => {
    const primary = targets.find((target) => target.id === initial.primaryTargetId);
    return primary?.institutionId ?? "";
  });

  const progress = useMemo(() => `${Math.round((step / 4) * 100)}%`, [step]);
  const primaryTargetId = primaryInstitutionId ? (majorByInstitution[primaryInstitutionId] ?? "") : "";
  const secondaryTargetIds = useMemo(
    () =>
      selectedInstitutionIds
        .filter((institutionId) => institutionId !== primaryInstitutionId)
        .map((institutionId) => majorByInstitution[institutionId])
        .filter(Boolean)
        .slice(0, 3),
    [selectedInstitutionIds, primaryInstitutionId, majorByInstitution],
  );
  const selectedTargets = useMemo(
    () => targets.filter((target) => target.id === primaryTargetId || secondaryTargetIds.includes(target.id)),
    [targets, primaryTargetId, secondaryTargetIds],
  );
  const needsIgetcWarning = selectedTargets.some((target) => !target.recognizesIgetc);
  const majorsComplete =
    selectedInstitutionIds.length > 0 &&
    Boolean(primaryInstitutionId && primaryTargetId) &&
    selectedInstitutionIds.every((institutionId) => Boolean(majorByInstitution[institutionId]));

  const saveProfile = async (nextStep: number, completed = false) => {
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "profile",
          profile: { ...workspace.profile, onboardingStep: nextStep, onboardingCompleted: completed },
        }),
      });
      setWorkspace(body.workspace);
      setStep(nextStep);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not continue.");
    } finally {
      setWorking(false);
    }
  };

  const saveTargetsAndContinue = async () => {
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "targets",
          targets: { primaryTargetId, secondaryTargetIds, includeSecondaryDivergence },
        }),
      });
      setWorkspace(body.workspace);
      const profileBody = await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "profile",
          profile: { ...body.workspace.profile, onboardingStep: 3, onboardingCompleted: editing ? workspace.profile.onboardingCompleted : false },
        }),
      });
      setWorkspace(profileBody.workspace);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not save transfer targets.");
    } finally {
      setWorking(false);
    }
  };

  const toggleInstitution = (institutionId: string) => {
    setSelectedInstitutionIds((current) => {
      const removing = current.includes(institutionId);
      const next = removing ? current.filter((id) => id !== institutionId) : [...current, institutionId];
      setMajorByInstitution((majors) => {
        if (!removing) return majors;
        const copy = { ...majors };
        delete copy[institutionId];
        return copy;
      });
      setPrimaryInstitutionId((primary) => {
        if (!removing) return primary || institutionId;
        if (primary === institutionId) return next[0] ?? "";
        return next.includes(primary) ? primary : next[0] ?? "";
      });
      return next;
    });
  };

  const selectMajorForInstitution = (institutionId: string, targetId: string) => {
    setMajorByInstitution((current) => ({ ...current, [institutionId]: targetId }));
    setPrimaryInstitutionId((primary) => primary || institutionId);
  };

  const addCourse = async () => {
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        body: JSON.stringify({ catalogCourseId: selectedCourseId, grade: grade || null, term, status }),
      });
      const course = body.course as ProductionCourse;
      setWorkspace((current) => ({
        ...current,
        courses: [...current.courses.filter((item) => item.catalogCourseId !== course.catalogCourseId), course],
      }));
      setGrade("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not add that course.");
    } finally {
      setWorking(false);
    }
  };

  const removeCourse = async (id: string) => {
    setWorking(true);
    setError("");
    try {
      await jsonRequest(`/api/me/courses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setWorkspace((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== id) }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not remove that course.");
    } finally {
      setWorking(false);
    }
  };

  const finish = async () => {
    const trimmedTerm = targetTerm.trim();
    if (trimmedTerm && !isPreferredTransferTerm(trimmedTerm)) {
      setError("Preferred transfer term must be Fall, Spring, or Summer plus a year, for example Spring 2029.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "preferences",
          preferences: {
            maxUnits,
            summerEnrollment,
            weeklyWorkHours,
            targetTerm: trimmedTerm || null,
          },
        }),
      });
      await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "profile",
          profile: { ...workspace.profile, onboardingStep: 4, onboardingCompleted: true },
        }),
      });
      router.push("/app/plan?new=1");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not finish onboarding.");
      setWorking(false);
    }
  };

  return (
    <main className="onboarding-page">
      <header className="onboarding-top">
        <Link href="/" className="production-brand">
          Waylo
        </Link>
        <Link href={editing ? "/app" : "/"} className="production-text-link">
          {editing ? "Back to dashboard" : "Exit"}
        </Link>
      </header>
      <section className="onboarding-panel">
        <div className="onboarding-progress" aria-label="Onboarding progress">
          <div>
            <strong>Step {step} of 4</strong>
            <span>{STEP_LABELS[step - 1]}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: progress }} />
          </div>
          <ol>
            {STEP_LABELS.map((label, index) => (
              <li key={label} className={index + 1 <= step ? "active" : ""}>
                {index + 1 < step ? <Check size={13} /> : index + 1}
                <span>{label}</span>
              </li>
            ))}
          </ol>
        </div>
        {error ? (
          <div className="production-error" role="alert">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="onboarding-question ">
            <h1 ref={headingRef} tabIndex={-1}>What college do you attend?</h1>
            <p>Waylo’s first release is built specifically for College of the Canyons students.</p>
            <button className="selection-row selected" type="button">
              <span>
                <strong>College of the Canyons</strong>
                <small>Santa Clarita, California</small>
              </span>
              <Check />
            </button>
            <div className="onboarding-actions">
              <button
                className="production-button primary"
                disabled={!hydrated || working}
                onClick={() => void saveProfile(2)}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding-question ">
            <h1 ref={headingRef} tabIndex={-1}>Where do you want to transfer?</h1>
            <p>
              Pick your universities first. Then choose exactly one major for each school, and mark which campus is
              primary.
            </p>

            <h2 className="onboarding-subheading">1. Universities</h2>
            <div className="selection-group" data-testid="university-list">
              {institutions.map((institution) => {
                const selected = selectedInstitutionIds.includes(institution.id);
                return (
                  <button
                    key={institution.id}
                    type="button"
                    className={`selection-row ${selected ? "selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => toggleInstitution(institution.id)}
                  >
                    <span>
                      <strong>{institution.name}</strong>
                      <small>{selected ? "Selected" : "Tap to include"}</small>
                    </span>
                    {selected ? <Check /> : null}
                  </button>
                );
              })}
            </div>

            <h2 className="onboarding-subheading">2. Majors</h2>
            {selectedInstitutionIds.length === 0 ? (
              <p className="onboarding-hint">Select at least one university to choose majors.</p>
            ) : (
              <div className="campus-major-stack" data-testid="primary-target-list">
                {selectedInstitutionIds.map((institutionId) => {
                  const institution = institutions.find((item) => item.id === institutionId);
                  const campusMajors = targets.filter((target) => target.institutionId === institutionId);
                  const selectedMajorId = majorByInstitution[institutionId] ?? "";
                  const isPrimaryCampus = primaryInstitutionId === institutionId;
                  return (
                    <section
                      key={institutionId}
                      className={`campus-major-card ${isPrimaryCampus ? "is-primary" : ""}`}
                      data-testid={`campus-majors-${institutionId}`}
                    >
                      <header className="campus-major-header">
                        <div>
                          <h3>{institution?.name ?? institutionId}</h3>
                          <p>Choose one major for this campus.</p>
                        </div>
                        <label className="primary-campus-control">
                          <input
                            type="radio"
                            name="primary-campus"
                            checked={isPrimaryCampus}
                            onChange={() => setPrimaryInstitutionId(institutionId)}
                          />
                          Primary school
                        </label>
                      </header>
                      <div
                        className="selection-group"
                        role="radiogroup"
                        aria-label={`Major at ${institution?.name ?? institutionId}`}
                      >
                        {campusMajors.map((target) => {
                          const selected = selectedMajorId === target.id;
                          return (
                            <button
                              key={target.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              className={`selection-row ${selected ? "selected" : ""}`}
                              onClick={() => selectMajorForInstitution(institutionId, target.id)}
                            >
                              <span>
                                <strong>{target.displayName}</strong>
                                <small>
                                  {target.degree} · Tier {target.ingestionTier}
                                  {target.coverageTier === "reviewed" || target.coverageTier === "full"
                                    ? " · reviewed pathway"
                                    : " · planning archetype"}
                                </small>
                              </span>
                              {selected ? <Check /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {secondaryTargetIds.length > 0 ? (
              <label className="checkbox-row" style={{ marginTop: "1rem" }}>
                <input
                  type="checkbox"
                  checked={includeSecondaryDivergence}
                  onChange={(event) => setIncludeSecondaryDivergence(event.target.checked)}
                />
                Include secondary major prep when packing terms
              </label>
            ) : null}
            {needsIgetcWarning ? (
              <div className="production-error" role="status" style={{ marginTop: "1rem" }}>
                One or more selected private universities do not recognize IGETC. California GE packaging will not
                exempt university breadth.
              </div>
            ) : null}
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="production-button primary"
                disabled={!hydrated || working || !majorsComplete}
                onClick={() => void saveTargetsAndContinue()}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-question course-question">
            <h1 ref={headingRef} tabIndex={-1}>
              {editing ? "Edit your completed courses" : "What have you completed?"}
            </h1>
            <p>
              {editing
                ? "Update completed or in-progress College of the Canyons courses. Waylo uses this history to rebuild your plan."
                : "Add completed or in-progress College of the Canyons courses. You can review every entry before planning."}
            </p>
            <form
              className="course-entry-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void addCourse();
              }}
            >
              <label>
                Course
                <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}>
                  {catalog.map((course) => (
                    <option value={course.id} key={course.id}>
                      {course.code} · {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Term
                <input value={term} onChange={(event) => setTerm(event.target.value)} />
              </label>
              <label>
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In progress</option>
                </select>
              </label>
              <label>
                Grade
                <input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="Optional" />
              </label>
              <button
                type="submit"
                className="production-button primary"
                disabled={working || !selectedCourseId}
              >
                Add course
              </button>
            </form>
            <div className="confirmed-course-list">
              {workspace.courses.length ? (
                workspace.courses.map((course) => (
                  <div key={course.id}>
                    <span>
                      <strong>{course.code}</strong>
                      <small>
                        {course.title} · {course.term} ·{" "}
                        {course.status === "completed" ? course.grade || "Grade not entered" : "In progress"}
                      </small>
                    </span>
                    <button aria-label={`Remove ${course.code}`} onClick={() => void removeCourse(course.id)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <strong>No courses yet</strong>
                  <p>Add at least one completed or in-progress course to continue.</p>
                </div>
              )}
            </div>
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="production-button primary"
                disabled={working || workspace.courses.length === 0}
                onClick={() => void saveProfile(4, editing && workspace.profile.onboardingCompleted)}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="onboarding-question ">
            <h1 ref={headingRef} tabIndex={-1}>Schedule preferences</h1>
            <p>These preferences shape the schedule. They never waive a prerequisite or requirement.</p>
            <div className="preference-form">
              <label>
                Maximum units per semester
                <input
                  type="number"
                  min="6"
                  max="20"
                  value={maxUnits}
                  onChange={(event) => setMaxUnits(Number(event.target.value))}
                />
              </label>
              <label>
                Weekly work hours
                <input
                  type="number"
                  min="0"
                  max="80"
                  value={weeklyWorkHours}
                  onChange={(event) => setWeeklyWorkHours(Number(event.target.value))}
                />
              </label>
              <label>
                Preferred transfer term
                <input
                  value={targetTerm}
                  placeholder="Optional · Spring 2029"
                  aria-describedby="target-term-hint"
                  aria-invalid={Boolean(targetTerm.trim()) && !isPreferredTransferTerm(targetTerm)}
                  onChange={(event) => setTargetTerm(event.target.value)}
                />
                <small id="target-term-hint">Use Fall, Spring, or Summer plus a year, or leave blank.</small>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={summerEnrollment}
                  onChange={(event) => setSummerEnrollment(event.target.checked)}
                />
                Include summer courses
              </label>
            </div>
            <div className="privacy-note">
              <strong>Your confirmed courses are saved to your account.</strong>
              <small>Waylo does not store a transcript file in this manual-entry flow.</small>
            </div>
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(3)}>
                Back
              </button>
              <button
                type="button"
                className="production-button primary"
                disabled={working || (Boolean(targetTerm.trim()) && !isPreferredTransferTerm(targetTerm))}
                onClick={() => void finish()}
              >
                {working ? "Saving…" : "View proposed schedule"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
