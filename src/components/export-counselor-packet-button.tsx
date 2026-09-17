"use client";

import { Printer } from "lucide-react";

/** One-click print trigger for the counselor audit packet. */
export function ExportCounselorPacketButton() {
  return (
    <button
      type="button"
      className="production-button no-print"
      onClick={() => window.print()}
      aria-label="Take this to your counselor"
      title="Print a one-page summary to bring to counseling"
    >
      <Printer size={16} aria-hidden />
      Take this to your counselor
    </button>
  );
}
