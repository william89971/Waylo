"use client";

import { Printer } from "lucide-react";

/** One-click print trigger for the counselor audit packet. */
export function ExportCounselorPacketButton() {
  return (
    <button
      type="button"
      className="production-button no-print"
      onClick={() => window.print()}
      aria-label="Export Counselor Audit"
    >
      <Printer size={16} aria-hidden />
      Export Counselor Audit
    </button>
  );
}
