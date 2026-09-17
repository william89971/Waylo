import { describe, expect, it } from "vitest";
import { matrixRowKind } from "@/lib/articulation/matrix-view";

describe("matrixRowKind", () => {
  it("treats a class required at two schools as overlapping", () => {
    expect(
      matrixRowKind({
        cells: {
          a: { status: "verified" },
          b: { status: "review" },
        },
      }),
    ).toBe("overlap");
  });

  it("treats a class required at only one of the selected schools as divergent", () => {
    expect(
      matrixRowKind({
        cells: {
          a: { status: "verified" },
          b: { status: "unrequired" },
        },
      }),
    ).toBe("divergent");
  });
});
