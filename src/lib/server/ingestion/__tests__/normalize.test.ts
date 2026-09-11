import { describe, expect, it } from "vitest";
import {
  formatIngestionDiff,
  ingestAssistFixtures,
  ingestPrivateArchetypes,
  ingestUscFixtures,
} from "@/lib/server/ingestion/normalize";

describe("fixture ingestion", () => {
  it("normalizes ASSIST fixtures in dry-run mode", () => {
    const result = ingestAssistFixtures({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.provider).toBe("assist");
    expect(result.rules.length).toBeGreaterThan(0);
    expect(result.validationErrors).toEqual([]);
    expect(formatIngestionDiff(result)).toContain("dryRun=true");
  });

  it("normalizes USC fixtures", () => {
    const result = ingestUscFixtures({ dryRun: true });
    expect(result.provider).toBe("usc");
    expect(result.rules.length).toBeGreaterThan(0);
    expect(result.validationErrors).toEqual([]);
  });

  it("loads private archetypes without HTTP", () => {
    const result = ingestPrivateArchetypes({ dryRun: true });
    expect(result.provider).toBe("private");
    expect(result.rules.length).toBeGreaterThan(0);
  });

  it("keeps dry-run from mutating release state and reports validation gaps", () => {
    const assist = ingestAssistFixtures({ dryRun: true });
    const usc = ingestUscFixtures({ dryRun: true });
    expect(assist.dryRun).toBe(true);
    expect(usc.dryRun).toBe(true);
    expect(assist.validationErrors).toEqual([]);
    expect(usc.validationErrors).toEqual([]);
    expect(formatIngestionDiff(assist)).not.toMatch(/wroteRelease|promotedActive/i);
  });
});
