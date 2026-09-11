import { ingestAssistFixtures, type NormalizedIngestionResult } from "@/lib/server/ingestion/normalize";

/** Tier-1 ASSIST provider. CI uses fixtures only. */
export function runAssistIngestion(options: { dryRun?: boolean; fixturesDir?: string } = {}): NormalizedIngestionResult {
  return ingestAssistFixtures({
    dryRun: options.dryRun ?? true,
    fixturesDir: options.fixturesDir,
  });
}
