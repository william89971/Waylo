import { z } from "zod";

const ProductionEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WAYLO_ADMIN_USER_IDS: z.string().default(""),
});

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function assertProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  const parsed = ProductionEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Waylo production configuration is incomplete: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
}

export function isTestAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.WAYLO_TEST_AUTH === "1";
}

export function isAdminUserId(userId: string) {
  return (process.env.WAYLO_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(userId);
}
