"use client";

import { useEffect } from "react";

export function EvidenceFocus({ targetId }: { targetId?: string }) {
  useEffect(() => {
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: "start" });
  }, [targetId]);
  return null;
}
