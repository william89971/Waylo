"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const hydrated = useWorkspaceStore((state) => state.hydrated);
  useEffect(() => { void hydrate(); }, [hydrate]);

  if (!hydrated) {
    return (
      <main className="workspace-loading-shell" aria-busy="true" aria-live="polite">
        <div className="workspace-loading-mark" aria-hidden="true">W</div>
        <div>
          <strong>Waylo</strong>
          <span>Loading your academic twin…</span>
        </div>
      </main>
    );
  }

  return children;
}
