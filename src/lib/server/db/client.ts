import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isDatabaseConfigured } from "@/lib/server/env";
import * as schema from "@/lib/server/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

/**
 * Application DB client.
 * Uses DATABASE_URL (Neon pooled / PgBouncer-compatible connection string).
 * The neon-http driver issues one-shot HTTP queries, so it is safe with pooled
 * endpoints and does not hold idle TCP sessions across serverless invocations.
 * Migrations must use DATABASE_URL_UNPOOLED (see drizzle.config.ts).
 */
export function getDatabase() {
  if (!isDatabaseConfigured()) return undefined;
  if (!database) {
    const connectionString = process.env.DATABASE_URL!;
    database = drizzle(neon(connectionString), { schema });
  }
  return database;
}
