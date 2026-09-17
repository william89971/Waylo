"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { isPreferredTransferTerm } from "@/lib/admissions-strategy";
import { targetCoverageNote } from "@/lib/student-facing-copy";
import { TranscriptImport } from "@/components/transcript-import";
import type { StudentCatalogCourse } from "@/lib/articulation/student-catalog";
import type { ProductionCourse, SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

const STEP_LABELS = ["Schools and majors", "Your COC classes", "Schedule"];

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
  catalog: StudentCatalogCourse[];
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
  const [step, setStep] = useState(() => {
    const raw = startStep ?? (initial.profile.onboardingCompleted ? 4 : initial.profile.onboardingStep);
    return raw <= 1 ? 2 : raw;
  });
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(catalog[0]?.id ?? "");
  const [term, setTerm] = useState("Fall 2026");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState<"completed" | "in_progress">("completed");
  const [maxUnits, setMaxUnits] = useState(initial.preferences.maxUnits);
  const [summerEnrollment, setSummerEnrollment] = useState(initial.preferences.summerEnrollment);
  const [targetTerm, setTargetTerm] = useState(initial.preferences.targetTerm ?? "");
  const [includeSecondaryDivergence, setIncludeSecondaryDivergence] = useState(initial.includeSecondaryDivergence ?? true);
  const [otherCode, setOtherCode] = useState("");
  const [otherTitle, setOtherTitle] = useState("");
  const [otherCollege, setOtherCollege] = useState("");
  const [petitionTitle, setPetitionTitle] = useState("");
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

  const visibleStep = Math.min(3, Math.max(1, step - 1));
  const progress = useMemo(() => `${Math.round((visibleStep / 3) * 100)}%`, [visibleStep]);
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
      const selected = catalog.find((course) => course.id === selectedCourseId);
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        body: JSON.stringify({
          catalogCourseId: selectedCourseId,
          grade: grade || null,
          term,
          status,
          source: selected?.group === "ap" ? "ap" : "manual",
        }),
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

  const addOtherCollege = async () => {
    if (!otherCode.trim() || !otherTitle.trim()) {
      setError("Other-college coursework needs a course code and title.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        body: JSON.stringify({
          catalogCourseId: `ext:${otherCollege.trim() || "other"}:${otherCode.trim()}`,
          code: otherCode.trim(),
          title: `${otherTitle.trim()}${otherCollege.trim() ? ` (${otherCollege.trim()})` : ""}`,
          units: 0,
          grade: grade || null,
          term,
          status: "completed",
          source: "other_college",
        }),
      });
      const course = body.course as ProductionCourse;
      setWorkspace((current) => ({
        ...current,
        courses: [...current.courses.filter((item) => item.catalogCourseId !== course.catalogCourseId), course],
      }));
      setOtherCode("");
      setOtherTitle("");
      setOtherCollege("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not add that coursework.");
    } finally {
      setWorking(false);
    }
  };

  const addPetition = async () => {
    if (!petitionTitle.trim()) {
      setError("Describe the petition or substitution before saving it as pending.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        body: JSON.stringify({
          catalogCourseId: `petition:${petitionTitle.trim()}`,
          code: "Petition",
          title: petitionTitle.trim(),
          units: 0,
          grade: null,
          term,
          status: "completed",
          source: "petition",
        }),
      });
      const course = body.course as ProductionCourse;
      setWorkspace((current) => ({
        ...current,
        courses: [...current.courses.filter((item) => item.catalogCourseId !== course.catalogCourseId), course],
      }));
      setPetitionTitle("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Waylo could not record that petition.");
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
            weeklyWorkHours: 0,
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
      try {
        await jsonRequest("/api/me/plan", {
          method: "POST",
          body: JSON.stringify({ action: "save", strategy: "overlap" }),
        });
        router.push("/app?saved=1");
      } catch {
        router.push("/app/plan?new=1");
      }
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
            <strong>Step {visibleStep} of 3</strong>
            <span>{STEP_LABELS[visibleStep - 1]}</span>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: progress }} />
          </div>
          <ol>
            {STEP_LABELS.map((label, index) => (
              <li key={label} className={index + 1 <= visibleStep ? "active" : ""}>
                {index + 1 < visibleStep ? <Check size={13} /> : index + 1}
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

        {step === 2 ? (
          <div className="onboarding-question ">
            <h1 ref={headingRef} tabIndex={-1}>Where do you want to transfer?</h1>
            <p>
              Choose every university you are seriously considering. Waylo will show one plan that works across them.
              Mark your first-choice school.
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
                                  {target.degree} · {targetCoverageNote(target.coverageTier)}
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
                Also plan classes that only the second school needs
              </label>
            ) : null}
            {needsIgetcWarning ? (
              <div className="production-error" role="status" style={{ marginTop: "1rem" }}>
                At least one private university here does not take the California IGETC general-education package. Ask a
                counselor which extra GE or language classes you still need.
              </div>
            ) : null}
            <div className="onboarding-actions">
              <Link href={editing ? "/app" : "/"} className="production-button">
                {editing ? "Back" : "Exit"}
              </Link>
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
                ? "Update classes you have finished or are taking now. You can add more later."
                : "Add College of the Canyons classes, AP credit, or coursework from another college. Nothing from a transcript is saved until you confirm it."}
            </p>
            <TranscriptImport
              existingCourseIds={workspace.courses.map((course) => course.catalogCourseId)}
              onConfirmed={(courses) => {
                setWorkspace((current) => {
                  const next = [...current.courses];
                  for (const course of courses) {
                    const index = next.findIndex((item) => item.catalogCourseId === course.catalogCourseId);
                    if (index >= 0) next[index] = course;
                    else next.push(course);
                  }
                  return { ...current, courses: next };
                });
              }}
            />
            <form
              className="course-entry-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void addCourse();
              }}
            >
              <label>
                College of the Canyons class
                <select
                  value={selectedCourseId}
                  onChange={(event) => setSelectedCourseId(event.target.value)}
                  data-testid="coc-course-select"
                >
                  <optgroup label="College of the Canyons">
                    {catalog
                      .filter((course) => course.group === "coc")
                      .map((course) => (
                        <option value={course.id} key={course.id}>
                          {course.code} · {course.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="AP credit — pending until confirmed">
                    {catalog
                      .filter((course) => course.group === "ap")
                      .map((course) => (
                        <option value={course.id} key={course.id}>
                          {course.code}
                        </option>
                      ))}
                  </optgroup>
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
                        {course.source === "ap" || course.source === "other_college" || course.source === "petition" || course.matchStatus === "uncertain"
                          ? " · counselor confirmation required"
                          : ""}
                      </small>
                    </span>
                    <button aria-label={`Remove ${course.code}`} onClick={() => void removeCourse(course.id)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <strong>No classes yet</strong>
                  <p>That is okay. Continue and Waylo will plan from the start. You can add classes later.</p>
                </div>
              )}
            </div>
            <form
              className="course-entry-grid other-college-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void addOtherCollege();
              }}
            >
              <label>
                Other college
                <input value={otherCollege} onChange={(event) => setOtherCollege(event.target.value)} placeholder="Pierce College" />
              </label>
              <label>
                Course code
                <input value={otherCode} onChange={(event) => setOtherCode(event.target.value)} placeholder="ENGL 101" />
              </label>
              <label>
                Title
                <input value={otherTitle} onChange={(event) => setOtherTitle(event.target.value)} placeholder="College Reading and Composition" />
              </label>
              <button type="submit" className="production-button" disabled={working}>
                Save unmatched
              </button>
            </form>
            <form
              className="course-entry-grid petition-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void addPetition();
              }}
            >
              <label>
                Petition or substitution
                <input
                  value={petitionTitle}
                  onChange={(event) => setPetitionTitle(event.target.value)}
                  placeholder="Substitute MATH 140 for STAT C1000"
                />
              </label>
              <button type="submit" className="production-button" disabled={working}>
                Record as pending
              </button>
            </form>
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="production-button primary"
                disabled={working}
                onClick={() => void saveProfile(4, editing && workspace.profile.onboardingCompleted)}
              >
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="onboarding-question ">
            <h1 ref={headingRef} tabIndex={-1}>How heavy can next semester be?</h1>
            <p>Set a unit cap. Waylo will never skip a required class to stay under it.</p>
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
                Preferred transfer term
                <input
                  value={targetTerm}
                  placeholder="Optional · Spring 2029"
                  aria-describedby="target-term-hint"
                  aria-invalid={Boolean(targetTerm.trim()) && !isPreferredTransferTerm(targetTerm)}
                  onChange={(event) => setTargetTerm(event.target.value)}
                />
                <small id="target-term-hint">Use Fall, Spring, or Summer plus a year, or leave blank. This is a preference, not a transfer date.</small>
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
              <strong>Confirmed classes are saved to your account.</strong>
              <small>Transcript files are not stored. Unmatched, AP, and petition rows stay pending until a counselor confirms them.</small>
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
                {working ? "Saving…" : "See next semester"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
