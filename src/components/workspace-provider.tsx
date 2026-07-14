"use client";

import { useEffect } from "react";
import { useWorkspaceStore } from "@/lib/workspace-store";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  useEffect(() => { void hydrate(); }, [hydrate]);
  return children;
}
