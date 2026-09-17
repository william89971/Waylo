export type CalGetcArea = {
  id: string;
  label: string;
  typicalGraphCodes: string[];
};

/**
 * Cal-GETC replaced IGETC for California community college transfers.
 * Waylo does not certify GE completion. Typical course placements are
 * counselor questions, never satisfied facts.
 */
export const CAL_GETC_AREAS: CalGetcArea[] = [
  { id: "1a", label: "Cal-GETC Area 1A — English Composition", typicalGraphCodes: ["ENGL-101"] },
  { id: "1b", label: "Cal-GETC Area 1B — Critical Thinking and Composition", typicalGraphCodes: ["ENGL-103"] },
  { id: "2", label: "Cal-GETC Area 2 — Mathematical Concepts and Quantitative Reasoning", typicalGraphCodes: ["MATH-140", "MATH-211", "PSYCH-104"] },
  { id: "3", label: "Cal-GETC Area 3 — Arts and Humanities", typicalGraphCodes: [] },
  { id: "4", label: "Cal-GETC Area 4 — Social and Behavioral Sciences", typicalGraphCodes: ["ECON-201", "ECON-202", "PSYCH-101"] },
  { id: "5", label: "Cal-GETC Area 5 — Physical and Biological Sciences", typicalGraphCodes: ["CHEM-201", "BIOSCI-107", "PHYSIC-220"] },
  { id: "6", label: "Cal-GETC Area 6 — Ethnic Studies", typicalGraphCodes: [] },
];

export type CalGetcStanding = {
  areaId: string;
  label: string;
  status: "confirm_possible" | "not_shown";
  note: string;
};

export function evaluateCalGetc(completedGraphCodes: ReadonlySet<string>): CalGetcStanding[] {
  return CAL_GETC_AREAS.map((area) => {
    const hit = area.typicalGraphCodes.find((code) => completedGraphCodes.has(code));
    if (hit) {
      return {
        areaId: area.id,
        label: area.label,
        status: "confirm_possible" as const,
        note: `${hit} is often used for this area. Confirm current Cal-GETC with a counselor. Waylo does not certify GE completion.`,
      };
    }
    return {
      areaId: area.id,
      label: area.label,
      status: "not_shown" as const,
      note: "No listed course on your record is a typical placement. Ask a counselor which Cal-GETC classes still apply.",
    };
  });
}
