import { ingestPrivateArchetypes, type NormalizedIngestionResult } from "@/lib/server/ingestion/normalize";

/** Tier-2 private archetypes — static gold only, never scraped. */
export function runPrivateArchetypeSeed(options: { dryRun?: boolean } = {}): NormalizedIngestionResult {
  return ingestPrivateArchetypes({ dryRun: options.dryRun ?? true });
}
