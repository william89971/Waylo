export const AP_EXAMS = [
  { id: "ap:calc-ab", code: "AP Calculus AB", title: "Advanced Placement Calculus AB" },
  { id: "ap:calc-bc", code: "AP Calculus BC", title: "Advanced Placement Calculus BC" },
  { id: "ap:stats", code: "AP Statistics", title: "Advanced Placement Statistics" },
  { id: "ap:engl-lang", code: "AP English Language", title: "Advanced Placement English Language and Composition" },
  { id: "ap:engl-lit", code: "AP English Literature", title: "Advanced Placement English Literature and Composition" },
  { id: "ap:psych", code: "AP Psychology", title: "Advanced Placement Psychology" },
  { id: "ap:macro", code: "AP Macroeconomics", title: "Advanced Placement Macroeconomics" },
  { id: "ap:micro", code: "AP Microeconomics", title: "Advanced Placement Microeconomics" },
] as const;

export function isExternalCreditId(catalogCourseId: string) {
  return (
    catalogCourseId.startsWith("ap:") ||
    catalogCourseId.startsWith("ext:") ||
    catalogCourseId.startsWith("petition:")
  );
}
