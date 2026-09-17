import { describe, expect, it } from "vitest";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";
import { computeMultiTargetPlan } from "@/lib/articulation/multi-target-plan";
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

  it("does not invent a later term when the class never lands", () => {
    const placements = blockedNextTermPlacements(undefined, ["MATH-211"]);
    expect(placements).toEqual([{ code: "MATH-211", laterTermLabel: null }]);
    expect(blockedNextTermChipLabel(placements[0]!)).toBe("MATH-211 · not this term");
    expect(blockedNextTermCounselorLine(placements)).toBe("Not this term (student): MATH-211.");
  });
});
