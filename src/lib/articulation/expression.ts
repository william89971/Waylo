import type { ArticulationExpression } from "@/lib/articulation/types";

export interface ExpressionEvaluation {
  satisfied: boolean;
  usedCourseCodes: string[];
  missingCourseCodes: string[];
}

/**
 * Evaluate a fulfillment expression against completed course codes.
 * SERIES_COMPLETE is all-or-nothing: any missing member ⇒ unsatisfied (zero credit).
 */
export function evaluateExpression(
  expression: ArticulationExpression,
  completedCodes: ReadonlySet<string>,
): ExpressionEvaluation {
  switch (expression.type) {
    case "COURSE": {
      const done = completedCodes.has(expression.courseCode);
      return {
        satisfied: done,
        usedCourseCodes: done ? [expression.courseCode] : [],
        missingCourseCodes: done ? [] : [expression.courseCode],
      };
    }
    case "AND":
    case "SERIES_COMPLETE": {
      const clauses: ArticulationExpression[] =
        expression.type === "SERIES_COMPLETE"
          ? expression.courses.map((courseCode) => ({ type: "COURSE" as const, courseCode }))
          : expression.clauses;
      const parts = clauses.map((clause) => evaluateExpression(clause, completedCodes));
      const satisfied = parts.every((part) => part.satisfied);
      return {
        satisfied,
        usedCourseCodes: satisfied ? unique(parts.flatMap((part) => part.usedCourseCodes)) : [],
        missingCourseCodes: unique(parts.flatMap((part) => part.missingCourseCodes)),
      };
    }
    case "OR": {
      const parts = expression.clauses.map((clause) => evaluateExpression(clause, completedCodes));
      const winner = parts
        .filter((part) => part.satisfied)
        .sort((left, right) => left.usedCourseCodes.length - right.usedCourseCodes.length)[0];
      if (winner) {
        return { satisfied: true, usedCourseCodes: winner.usedCourseCodes, missingCourseCodes: [] };
      }
      return {
        satisfied: false,
        usedCourseCodes: [],
        missingCourseCodes: unique(parts.flatMap((part) => part.missingCourseCodes)),
      };
    }
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

export function expandCandidateSets(expression: ArticulationExpression): string[][] {
  switch (expression.type) {
    case "COURSE":
      return [[expression.courseCode]];
    case "AND":
    case "SERIES_COMPLETE": {
      const clauses: ArticulationExpression[] =
        expression.type === "SERIES_COMPLETE"
          ? expression.courses.map((courseCode) => ({ type: "COURSE" as const, courseCode }))
          : expression.clauses;
      return [unique(clauses.flatMap((clause) => expandCandidateSets(clause).flat()))];
    }
    case "OR":
      return expression.clauses.flatMap((clause) => expandCandidateSets(clause));
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

export function collectCourseCodes(expression: ArticulationExpression): string[] {
  switch (expression.type) {
    case "COURSE":
      return [expression.courseCode];
    case "AND":
    case "OR":
      return unique(expression.clauses.flatMap(collectCourseCodes));
    case "SERIES_COMPLETE":
      return [...expression.courses];
    default: {
      const _exhaustive: never = expression;
      return _exhaustive;
    }
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
