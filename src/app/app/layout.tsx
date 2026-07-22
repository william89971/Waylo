import { redirect } from "next/navigation";
import { ProductionAppShell } from "@/components/production-app-shell";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { isClerkConfigured } from "@/lib/server/env";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!await getAuthenticatedUserId()) redirect("/sign-in");
  return <ProductionAppShell clerkConfigured={isClerkConfigured()}>{children}</ProductionAppShell>;
}
