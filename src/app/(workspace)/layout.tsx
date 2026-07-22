import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { isAdminUserId } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect("/sign-in");
  if (!isAdminUserId(userId)) redirect("/app");
  return <WorkspaceProvider><AppShell>{children}</AppShell></WorkspaceProvider>;
}
