import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  ARTICULATION_RULE_SEED,
  COC_CATALOG_SEED,
  INSTITUTION_SEED,
  PREREQUISITE_SEED,
  SEED_RELEASE_ID,
  TARGET_MAJOR_SEED,
} from "@/lib/articulation/seed-data";
import {
  ArticulationExpressionSchema,
  targetMajorId,
  type ArticulationExpression,
  type ArticulationRule,
  type ArticulationSourceType,
  type TargetInstitution,
  type TargetMajorKey,
} from "@/lib/articulation/types";

export interface FixturePayload {
  source: string;
  agreementYear: string;
  sendingInstitution: string;
  receivingInstitution: string;
  major: string;
  rows: Array<{
    requirementKey: string;
    label: string;
    expression: ArticulationExpression;
    verificationTier: ArticulationRule["verificationTier"];
    notes?: string;
  }>;
}

export interface NormalizedIngestionResult {
  provider: "assist" | "usc" | "private";
  releaseId: string;
  dryRun: boolean;
  rules: ArticulationRule[];
  rawPayloads: Array<{ url: string; contentHash: string; body: FixturePayload }>;
  diff: { added: string[]; changed: string[]; retired: string[] };
  validationErrors: string[];
}

const INSTITUTION_ALIASES: Record<string, TargetInstitution> = {
  "University of California, Berkeley": "uc_berkeley",
  "University of California, San Diego": "uc_san_diego",
  "University of Southern California": "usc",
};

const MAJOR_ALIASES: Record<string, TargetMajorKey> = {
  Economics: "economics",
  "Data Science": "data_science",
  "Business Administration": "business_administration",
};

function hashBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function loadFixtures(dir: string): Array<{ file: string; payload: FixturePayload }> {
  const absolute = path.resolve(dir);
  return readdirSync(absolute)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      file: path.join(absolute, file),
      payload: JSON.parse(readFileSync(path.join(absolute, file), "utf8")) as FixturePayload,
    }));
}

function normalizeFixture(payload: FixturePayload, sourceType: ArticulationSourceType): ArticulationRule[] {
  const institution = INSTITUTION_ALIASES[payload.receivingInstitution];
  const major = MAJOR_ALIASES[payload.major];
  if (!institution || !major) {
    throw new Error(`Unsupported fixture mapping for ${payload.receivingInstitution} / ${payload.major}`);
  }
  const majorId = targetMajorId(institution, major);
  return payload.rows.map((row, index) => {
    const expression = ArticulationExpressionSchema.parse(row.expression);
    return {
      id: `ingest-${institution}-${major}-${row.requirementKey}-${index}`,
      targetMajorId: majorId,
      requirementKey: row.requirementKey,
      label: row.label,
      expression,
      verificationTier: row.verificationTier,
      sourceType,
      sourceUrl: sourceType === "assist_public" ? "https://assist.org/" : "https://arr.usc.edu/transfercredit/",
      effectiveYear: payload.agreementYear,
      notes: row.notes ?? "",
    } satisfies ArticulationRule;
  });
}

function diffRules(baseline: ArticulationRule[], next: ArticulationRule[]) {
  const baselineByKey = new Map(baseline.map((rule) => [`${rule.targetMajorId}:${rule.requirementKey}`, rule]));
  const nextByKey = new Map(next.map((rule) => [`${rule.targetMajorId}:${rule.requirementKey}`, rule]));
  const added: string[] = [];
  const changed: string[] = [];
  const retired: string[] = [];
  for (const [key, rule] of nextByKey) {
    const previous = baselineByKey.get(key);
    if (!previous) added.push(key);
    else if (
      JSON.stringify(previous.expression) !== JSON.stringify(rule.expression) ||
      previous.verificationTier !== rule.verificationTier
    ) {
      changed.push(key);
    }
  }
  for (const key of baselineByKey.keys()) {
    if (!nextByKey.has(key)) retired.push(key);
  }
  return { added, changed, retired };
}

function collectCodes(expression: ArticulationExpression): string[] {
  if (expression.type === "COURSE") return [expression.courseCode];
  if (expression.type === "SERIES_COMPLETE") return [...expression.courses];
  return expression.clauses.flatMap(collectCodes);
}

function validateRules(rules: ArticulationRule[]): string[] {
  const errors: string[] = [];
  const knownCodes = new Set(COC_CATALOG_SEED.map((course) => course.code));
  knownCodes.add("NEEDS-COUNSELOR");
  for (const rule of rules) {
    const parsed = ArticulationExpressionSchema.safeParse(rule.expression);
    if (!parsed.success) {
      errors.push(`${rule.id}: invalid expression`);
      continue;
    }
    if (rule.expression.type === "SERIES_COMPLETE" && rule.expression.courses.length < 2) {
      errors.push(`${rule.id}: SERIES_COMPLETE needs >= 2 courses`);
    }
    for (const code of collectCodes(rule.expression)) {
      if (!knownCodes.has(code)) errors.push(`${rule.id}: unknown course ${code}`);
    }
  }
  return errors;
}

export function ingestAssistFixtures(options: { dryRun?: boolean; fixturesDir?: string } = {}): NormalizedIngestionResult {
  const fixtures = loadFixtures(options.fixturesDir ?? "tests/fixtures/assist");
  const rules = fixtures.flatMap(({ payload }) => normalizeFixture(payload, "assist_public"));
  const baseline = ARTICULATION_RULE_SEED.filter((rule) => rule.sourceType === "assist_public");
  return {
    provider: "assist",
    releaseId: `assist-draft-${SEED_RELEASE_ID}`,
    dryRun: options.dryRun ?? true,
    rules,
    rawPayloads: fixtures.map(({ file, payload }) => ({
      url: `fixture://${path.basename(file)}`,
      contentHash: hashBody(payload),
      body: payload,
    })),
    diff: diffRules(baseline, rules),
    validationErrors: validateRules(rules),
  };
}

export function ingestUscFixtures(options: { dryRun?: boolean; fixturesDir?: string } = {}): NormalizedIngestionResult {
  const fixtures = loadFixtures(options.fixturesDir ?? "tests/fixtures/usc");
  const rules = fixtures.flatMap(({ payload }) => normalizeFixture(payload, "institutional_guide"));
  const baseline = ARTICULATION_RULE_SEED.filter((rule) => rule.sourceType === "institutional_guide");
  return {
    provider: "usc",
    releaseId: `usc-draft-${SEED_RELEASE_ID}`,
    dryRun: options.dryRun ?? true,
    rules,
    rawPayloads: fixtures.map(({ file, payload }) => ({
      url: `fixture://${path.basename(file)}`,
      contentHash: hashBody(payload),
      body: payload,
    })),
    diff: diffRules(baseline, rules),
    validationErrors: validateRules(rules),
  };
}

/** Tier-2 private archetypes — static gold only, never scraped. */
export function ingestPrivateArchetypes(options: { dryRun?: boolean } = {}): NormalizedIngestionResult {
  const rules = ARTICULATION_RULE_SEED.filter((rule) => rule.sourceType === "departmental_precedent");
  return {
    provider: "private",
    releaseId: `private-archetype-${SEED_RELEASE_ID}`,
    dryRun: options.dryRun ?? true,
    rules,
    rawPayloads: [{
      url: "seed://private-archetypes",
      contentHash: hashBody(rules),
      body: {
        source: "private_archetype",
        agreementYear: "2025-26",
        sendingInstitution: "College of the Canyons",
        receivingInstitution: "Private institutions",
        major: "Foundational Profile",
        rows: rules.map((rule) => ({
          requirementKey: rule.requirementKey,
          label: rule.label,
          expression: rule.expression,
          verificationTier: rule.verificationTier,
          notes: rule.notes,
        })),
      },
    }],
    diff: { added: [], changed: [], retired: [] },
    validationErrors: validateRules(rules),
  };
}

export function buildSeedCatalogSnapshot() {
  return {
    releaseId: SEED_RELEASE_ID,
    institutions: INSTITUTION_SEED,
    courses: COC_CATALOG_SEED,
    targetMajors: TARGET_MAJOR_SEED,
    prerequisites: PREREQUISITE_SEED,
    rules: ARTICULATION_RULE_SEED,
  };
}

export function formatIngestionDiff(result: NormalizedIngestionResult): string {
  const lines = [
    `provider=${result.provider} dryRun=${result.dryRun} release=${result.releaseId}`,
    `rules=${result.rules.length} payloads=${result.rawPayloads.length}`,
    `added=${result.diff.added.length} changed=${result.diff.changed.length} retired=${result.diff.retired.length}`,
  ];
  if (result.validationErrors.length) {
    lines.push(`validationErrors=${result.validationErrors.length}`);
    lines.push(...result.validationErrors.map((error) => `  - ${error}`));
  }
  if (result.diff.added.length) lines.push(`+ ${result.diff.added.join(", ")}`);
  if (result.diff.changed.length) lines.push(`~ ${result.diff.changed.join(", ")}`);
  if (result.diff.retired.length) lines.push(`- ${result.diff.retired.join(", ")}`);
  return lines.join("\n");
}

export function createIngestionRunId(provider: string): string {
  return `${provider}-${randomUUID()}`;
}
