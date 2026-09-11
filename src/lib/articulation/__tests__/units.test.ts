import { describe, expect, it } from "vitest";
import {
  articulatedUnitsForAudit,
  juniorStandingThreshold,
  toQuarterUnits,
  toSemesterUnits,
} from "@/lib/articulation/units";

describe("unit boundary", () => {
  it("converts only through audit helpers", () => {
    expect(toQuarterUnits(4)).toBe(6);
    expect(toSemesterUnits(6)).toBe(4);
    expect(juniorStandingThreshold("semester")).toBe(60);
    expect(juniorStandingThreshold("quarter")).toBe(90);
    expect(articulatedUnitsForAudit(60, "quarter")).toBe(90);
    expect(articulatedUnitsForAudit(60, "semester")).toBe(60);
  });
});
