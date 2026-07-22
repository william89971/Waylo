import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isDatabaseConfigured } from "@/lib/server/env";
import * as schema from "@/lib/server/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (!isDatabaseConfigured()) return undefined;
  if (!database) database = drizzle(neon(process.env.DATABASE_URL!), { schema });
  return database;
}
