"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, LockKeyhole, Plus, Trash2 } from "lucide-react";
import type { CourseDefinition } from "@/lib/domain";
import type { ProductionCourse, SelectableTarget, StudentWorkspaceRecord } from "@/lib/production-types";

const STEP_LABELS = ["Academic history", "Transfer goal", "Completed courses", "Preferences"];

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.error?.message ?? "Waylo could not save that change.");
  return body;
}

export function OnboardingFlow({
  initial,
  catalog,
  targets = [],
}: {
  initial: StudentWorkspaceRecord;
  catalog: CourseDefinition[];
  targets?: SelectableTarget[];
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [workspace, setWorkspace] = useState(initial);
  const [step, setStep] = useState(initial.profile.onboardingCompleted ? 4 : initial.profile.onboardingStep);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(catalog[0]?.id ?? "");
  const [term, setTerm] = useState("Fall 2026");
  const [grade, setGrade] = useState("");
  const [status, setStatus] = useState<"completed" | "in_progress">("completed");
  const [maxUnits, setMaxUnits] = useState(initial.preferences.maxUnits);
  const [summer, setSummer] = useState(initial.preferences.summerEnrollment);
  const [workHours, setWorkHours] = useState(initial.preferences.weeklyWorkHours);
  const [targetTerm, setTargetTerm] = useState(initial.preferences.targetTerm ?? "");
  const [primaryTargetId, setPrimaryTargetId] = useState(initial.primaryTargetId);
  const [secondaryTargetIds, setSecondaryTargetIds] = useState<string[]>(initial.secondaryTargetIds ?? []);
  const [includeSecondaryDivergence, setIncludeSecondaryDivergence] = useState(initial.includeSecondaryDivergence ?? true);
  const progress = useMemo(() => `${Math.round((step / 4) * 100)}%`, [step]);
  const selectedTargets = useMemo(
    () => targets.filter((target) => target.id === primaryTargetId || secondaryTargetIds.includes(target.id)),
    [targets, primaryTargetId, secondaryTargetIds],
  );
  const needsIgetcWarning = selectedTargets.some((target) => !target.recognizesIgetc);
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
          profile: { ...body.workspace.profile, onboardingStep: 3, onboardingCompleted: false },
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

  const toggleSecondary = (targetId: string) => {
    if (targetId === primaryTargetId) return;
    setSecondaryTargetIds((current) => {
      if (current.includes(targetId)) return current.filter((id) => id !== targetId);
      if (current.length >= 3) return current;
      return [...current, targetId];
    });
  };

  const addCourse = async () => {
    setWorking(true);
    setError("");
    try {
      const body = await jsonRequest("/api/me/courses", {
        method: "POST",
        body: JSON.stringify({ catalogCourseId: selectedCourse, grade: grade || null, term, status }),
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
    setWorking(true);
    setError("");
    try {
      await jsonRequest("/api/me", {
        method: "PATCH",
        body: JSON.stringify({
          section: "preferences",
          preferences: { maxUnits, summerEnrollment: summer, weeklyWorkHours: workHours, targetTerm: targetTerm || null },
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
        <span className="production-brand">Waylo</span>
        <span>Save and exit</span>
      </header>
      <section className="onboarding-panel">
        <div className="onboarding-progress">
          <div>
            <strong>Step {step} of 4</strong>
            <span>{STEP_LABELS[step - 1]}</span>
          </div>
          <div className="progress-track">
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
        {error ? <div className="production-error" role="alert">{error}</div> : null}

        {step === 1 ? (
          <div className="onboarding-question">
            <h1>What college do you attend?</h1>
            <p>Waylo’s first release is built specifically for College of the Canyons students.</p>
            <button className="selection-row selected">
              <span>
                <strong>College of the Canyons</strong>
                <small>Santa Clarita, California</small>
              </span>
              <Check />
            </button>
            <div className="onboarding-actions">
              <button className="production-button primary" disabled={!hydrated || working} onClick={() => void saveProfile(2)}>
                Continue <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding-question">
            <h1>Where do you want to transfer?</h1>
            <p>Pick one primary target and up to three secondary majors. Schedules stay in College of the Canyons semester units.</p>
            <div className="selection-group" data-testid="primary-target-list">
              {targets.map((target) => {
                const isPrimary = primaryTargetId === target.id;
                const isSecondary = secondaryTargetIds.includes(target.id);
                return (
                  <div
                    key={target.id}
                    className={`selection-row ${isPrimary ? "selected" : ""}`}
                    style={{ flexDirection: "column", alignItems: "stretch", gap: "0.55rem" }}
                  >
                    <button
                      type="button"
                      className="selection-row"
                      style={{ border: "none", padding: 0, background: "transparent", boxShadow: "none" }}
                      onClick={() => {
                        setPrimaryTargetId(target.id);
                        setSecondaryTargetIds((current) => current.filter((id) => id !== target.id));
                      }}
                    >
                      <span>
                        <strong>{target.institutionName}</strong>
                        <small>
                          {target.displayName} · {target.degree} · Tier {target.ingestionTier}
                          {target.coverageTier === "reviewed" || target.coverageTier === "full"
                            ? " · reviewed pathway"
                            : " · planning archetype"}
                        </small>
                      </span>
                      {isPrimary ? <Check /> : null}
                    </button>
                    {!isPrimary ? (
                      <label className="checkbox-row" style={{ margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={isSecondary}
                          disabled={!isSecondary && secondaryTargetIds.length >= 3}
                          onChange={() => toggleSecondary(target.id)}
                        />
                        Include as secondary
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
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
                One or more selected private universities do not recognize IGETC. California GE packaging will not exempt university breadth.
              </div>
            ) : null}
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="production-button primary"
                disabled={!hydrated || working || !primaryTargetId}
                onClick={() => void saveTargetsAndContinue()}
              >
                Continue <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding-question course-question">
            <h1>What have you completed?</h1>
            <p>Add completed or in-progress College of the Canyons courses. You can review every entry before planning.</p>
            <div className="course-entry-grid">
              <label>
                Course
                <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
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
              <button className="production-button primary" onClick={() => void addCourse()} disabled={working || !selectedCourse}>
                <Plus size={17} /> Add course
              </button>
            </div>
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
                <p>No courses added yet.</p>
              )}
            </div>
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="production-button primary"
                disabled={working || workspace.courses.length === 0}
                onClick={() => void saveProfile(4)}
              >
                Continue <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="onboarding-question">
            <h1>What should your plan account for?</h1>
            <p>These preferences shape the schedule. They never waive a prerequisite or requirement.</p>
            <div className="preference-form">
              <label>
                Maximum units per semester
                <input type="number" min="6" max="20" value={maxUnits} onChange={(event) => setMaxUnits(Number(event.target.value))} />
              </label>
              <label>
                Weekly work hours
                <input type="number" min="0" max="80" value={workHours} onChange={(event) => setWorkHours(Number(event.target.value))} />
              </label>
              <label>
                Preferred transfer term
                <input value={targetTerm} placeholder="Optional · Spring 2029" onChange={(event) => setTargetTerm(event.target.value)} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={summer} onChange={(event) => setSummer(event.target.checked)} />
                Include summer courses
              </label>
            </div>
            <div className="privacy-note">
              <LockKeyhole size={18} />
              <span>
                <strong>Your confirmed courses are saved to your account.</strong>
                <small>Waylo does not store a transcript file in this manual-entry flow.</small>
              </span>
            </div>
            <div className="onboarding-actions">
              <button className="production-button" onClick={() => setStep(3)}>
                Back
              </button>
              <button className="production-button primary" disabled={working} onClick={() => void finish()}>
                {working ? "Building your plan…" : "Generate my plan"} <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
