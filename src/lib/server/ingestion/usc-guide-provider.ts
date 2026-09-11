import { ingestUscFixtures, type NormalizedIngestionResult } from "@/lib/server/ingestion/normalize";

/** Tier-1 USC Transfer Planning Guide provider. Fixture-first for CI. */
export function runUscGuideIngestion(options: { dryRun?: boolean; fixturesDir?: string } = {}): NormalizedIngestionResult {
  return ingestUscFixtures({
    dryRun: options.dryRun ?? true,
    fixturesDir: options.fixturesDir,
  });
}
