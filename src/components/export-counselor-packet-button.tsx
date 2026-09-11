"use client";

import { Printer } from "lucide-react";

/** One-click print trigger for the counselor audit packet. */
export function ExportCounselorPacketButton() {
  return (
    <button
      type="button"
      className="production-button no-print"
      onClick={() => window.print()}
      aria-label="Export counselor packet"
    >
      <Printer size={16} aria-hidden />
      Export Counselor Packet
    </button>
  );
}
