"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  counselorMailtoHref,
  isCounselorEmail,
  type CounselorEmailPayload,
} from "@/lib/counselor-handoff";

const STORAGE_KEY = "waylo-counselor-email";

export function CounselorHandoff({
  email,
  children,
  status,
  primaryAction,
}: {
  email: CounselorEmailPayload;
  children?: ReactNode;
  status?: string;
  primaryAction?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setAddress(saved);
    } catch {
      /* ignore private-mode storage */
    }
  }, []);

  const downloadPdf = () => {
    const previous = document.title;
    document.title = `Waylo — ${email.nextTermLabel} — ${email.primaryLabel}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const send = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = address.trim();
    if (!isCounselorEmail(trimmed)) {
      setError("Enter your counselor's email.");
      return;
    }
    setError("");
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
    window.location.href = counselorMailtoHref(trimmed, email);
  };

  return (
    <div className="counselor-handoff no-print">
      <p className="counselor-handoff-label">{status ?? "Take this to your counselor"}</p>
      <div className="counselor-handoff-actions">
        {primaryAction}
        <button type="button" className={primaryAction ? "production-button" : "production-button primary"} onClick={downloadPdf}>
          Download PDF
        </button>
        <button
          type="button"
          className="production-button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          Email counselor
        </button>
        {children}
      </div>
      {open ? (
        <form className="counselor-email-form" onSubmit={send}>
          <label>
            Counselor's email
            <input
              type="email"
              name="counselor-email"
              autoComplete="email"
              inputMode="email"
              placeholder="name@canyons.edu"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="production-button primary">
            Send from my email
          </button>
          <p>Opens your mail app with next semester written.</p>
        </form>
      ) : null}
      {error ? (
        <p className="production-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
