import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { computeMultiTargetPlan, expandLabPairCourseCodes } from "@/lib/articulation/multi-target-plan";
import { targetMajorId } from "@/lib/articulation/types";
import {
  blockedNextTermChipLabel,
  blockedNextTermCounselorLine,
  blockedNextTermPlacements,
  uniqueBlockedNextTermCodes,
} from "@/lib/next-term-blocks";

describe("next-term blocks", () => {
  const graph = getSeedArticulationGraph();
  const ucsdData = targetMajorId("uc_san_diego", "data_science");

  it("caps and normalizes blocked codes", () => {
    expect(uniqueBlockedNextTermCodes(["math 211", "MATH-211", " COMP-111 "])).toEqual(["MATH-211", "COMP-111"]);
    expect(uniqueBlockedNextTermCodes(Array.from({ length: 20 }, (_, index) => `MATH-${index}`))).toHaveLength(12);
  });

  it("names the later term a blocked class moves to", () => {
    const baseline = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucsdData,
      maxUnitsPerTerm: 15,
      graph,
    });
    const firstCode = baseline.schedule.terms[0]?.courses[0]?.code;
    expect(firstCode).toBeTruthy();
    const blocked = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucsdData,
      maxUnitsPerTerm: 15,
      unavailableNextTermCodes: [firstCode!],
      graph,
    });
    const placements = blockedNextTermPlacements(blocked, [firstCode!]);
    expect(placements).toEqual([
      {
        code: firstCode,
        laterTermLabel: expect.stringMatching(/^(Fall|Spring|Summer) \d{4}$/),
      },
    ]);
    expect(blockedNextTermChipLabel(placements[0]!)).toBe(
      `${firstCode} · not this term · ${placements[0]!.laterTermLabel}`,
    );
    expect(blockedNextTermCounselorLine(placements)).toBe(
      `Not this term (student): ${firstCode} — on the plan in ${placements[0]!.laterTermLabel}.`,
    );
  });

  it("names the later term for a lecture and its lab when either is skipped", () => {
    const blocked = computeMultiTargetPlan({
      history: [],
      primaryTargetId: ucsdData,
      maxUnitsPerTerm: 15,
      unavailableNextTermCodes: ["CMPSCI-111"],
      graph,
    });
    const placements = blockedNextTermPlacements(blocked, expandLabPairCourseCodes(["CMPSCI-111"], graph));
    expect(placements.map((placement) => placement.code).sort()).toEqual(["CMPSCI-111", "CMPSCI-111L"]);
    expect(new Set(placements.map((placement) => placement.laterTermLabel)).size).toBe(1);
    expect(placements[0]?.laterTermLabel).toMatch(/^(Fall|Spring|Summer) \d{4}$/);
  });

  it("does not invent a later term when the class never lands", () => {
    const placements = blockedNextTermPlacements(undefined, ["MATH-211"]);
    expect(placements).toEqual([{ code: "MATH-211", laterTermLabel: null }]);
    expect(blockedNextTermChipLabel(placements[0]!)).toBe("MATH-211 · not this term");
    expect(blockedNextTermCounselorLine(placements)).toBe("Not this term (student): MATH-211.");
  });
});
