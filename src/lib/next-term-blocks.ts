import type { MultiTargetPlanResult } from "@/lib/articulation/types";

export const MAX_BLOCKED_NEXT_TERM_CODES = 12;

export type BlockedNextTermPlacement = {
  code: string;
  laterTermLabel: string | null;
};

export function normalizePlanCourseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "-");
}

export function uniqueBlockedNextTermCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of codes) {
    const code = normalizePlanCourseCode(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    unique.push(code);
    if (unique.length >= MAX_BLOCKED_NEXT_TERM_CODES) break;
  }
  return unique;
}

export function blockedNextTermPlacements(
  plan: MultiTargetPlanResult | undefined,
  codes: string[],
): BlockedNextTermPlacement[] {
  const laterByCode = new Map<string, string>();
  for (const term of plan?.schedule.terms.slice(1) ?? []) {
    for (const course of term.courses) {
      const key = normalizePlanCourseCode(course.code);
      if (!laterByCode.has(key)) laterByCode.set(key, term.label);
    }
  }
  return uniqueBlockedNextTermCodes(codes).map((code) => ({
    code,
    laterTermLabel: laterByCode.get(code) ?? null,
  }));
}

export function blockedNextTermChipLabel(placement: BlockedNextTermPlacement) {
  return placement.laterTermLabel
    ? `${placement.code} · not this term · ${placement.laterTermLabel}`
    : `${placement.code} · not this term`;
}

export function blockedNextTermCounselorLine(placements: BlockedNextTermPlacement[]): string | null {
  if (!placements.length) return null;
  const parts = placements.map((placement) =>
    placement.laterTermLabel
      ? `${placement.code} — on the plan in ${placement.laterTermLabel}`
      : placement.code,
  );
  return `Not this term (student): ${parts.join("; ")}.`;
}
