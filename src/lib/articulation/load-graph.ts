import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import {
  buildArticulationGraphFromSeed,
  getSeedArticulationGraph,
  indexGraph,
} from "@/lib/articulation/graph";
import { SEED_RELEASE_ID } from "@/lib/articulation/seed-data";
import type {
  ArticulationExpression,
  ArticulationGraph,
  ArticulationRule,
  ArticulationSourceType,
  CatalogCourse,
  CoursePrerequisite,
  Institution,
  TargetInstitution,
  TargetMajor,
  TargetMajorKey,
  UnitSystem,
  VerificationTier,
} from "@/lib/articulation/types";
import { getDatabase } from "@/lib/server/db/client";
import {
  academicDataReleases,
  articulationRules,
  catalogCourses,
  coursePrerequisites,
  institutions,
  targetMajors,
} from "@/lib/server/db/schema";

export const ACTIVE_ACADEMIC_RELEASE_TAG = "active-academic-release";

type CachedGraphPayload = {
  releaseId: string;
  institutions: Institution[];
  courses: CatalogCourse[];
  targetMajors: TargetMajor[];
  rules: ArticulationRule[];
  prerequisites: CoursePrerequisite[];
};

/** Process-local cache keyed by active release id (Maps are not JSON-serializable). */
let processGraphCache: { releaseId: string; graph: ArticulationGraph } | undefined;

export function invalidateActiveArticulationGraphCache() {
  processGraphCache = undefined;
}

async function resolveActiveReleaseId(): Promise<string> {
  const db = getDatabase();
  if (!db) return SEED_RELEASE_ID;
  const [active] = await db
    .select({ id: academicDataReleases.id })
    .from(academicDataReleases)
    .where(eq(academicDataReleases.status, "active"))
    .limit(1);
  return active?.id ?? SEED_RELEASE_ID;
}

const resolveActiveReleaseIdCached = unstable_cache(
  async () => resolveActiveReleaseId(),
  ["waylo-active-academic-release-id"],
  { tags: [ACTIVE_ACADEMIC_RELEASE_TAG], revalidate: false },
);

async function loadGraphPayloadFromNeon(releaseId: string): Promise<CachedGraphPayload | undefined> {
  const db = getDatabase();
  if (!db) return undefined;

  const [release] = await db
    .select({ id: academicDataReleases.id })
    .from(academicDataReleases)
    .where(eq(academicDataReleases.id, releaseId))
    .limit(1);
  if (!release) return undefined;

  const [institutionRows, courseRows, majorRows, ruleRows, prereqRows] = await Promise.all([
    db.select().from(institutions),
    db.select().from(catalogCourses).where(eq(catalogCourses.releaseId, releaseId)),
    db.select().from(targetMajors).where(eq(targetMajors.releaseId, releaseId)),
    db.select().from(articulationRules).where(eq(articulationRules.releaseId, releaseId)),
    db.select().from(coursePrerequisites).where(eq(coursePrerequisites.releaseId, releaseId)),
  ]);

  if (!courseRows.length || !majorRows.length || !ruleRows.length) return undefined;

  return {
    releaseId,
    institutions: institutionRows.map((row) => ({
      id: row.id as TargetInstitution,
      code: row.code,
      name: row.name,
      unitSystem: row.unitSystem as UnitSystem,
      recognizesIgetc: row.recognizesIgetc,
      ingestionTier: row.ingestionTier as "1" | "2",
    })),
    courses: courseRows.map((row) => ({
      id: row.id,
      code: row.code,
      title: row.title,
      semesterUnits: row.semesterUnits,
      category: row.category as CatalogCourse["category"],
      prerequisites: row.prerequisites,
      offeredTerms: row.offeredTerms as CatalogCourse["offeredTerms"],
      labPairCourseId: row.labPairCourseId ?? undefined,
    })),
    targetMajors: majorRows.map((row) => ({
      id: row.id,
      institutionId: row.institutionId as TargetInstitution,
      major: row.major as TargetMajorKey,
      displayName: row.displayName,
      degree: row.degree as TargetMajor["degree"],
      coverageTier: row.coverageTier as TargetMajor["coverageTier"],
      constraintNotes: row.constraintNotes,
    })),
    rules: ruleRows.map((row) => ({
      id: row.id,
      targetMajorId: row.targetMajorId,
      requirementKey: row.requirementKey,
      label: row.label,
      expression: row.fulfillmentExpression as ArticulationExpression,
      verificationTier: row.verificationTier as VerificationTier,
      sourceType: row.sourceType as ArticulationSourceType,
      sourceUrl: row.sourceUrl,
      effectiveYear: row.effectiveYear,
      notes: row.notes,
    })),
    prerequisites: prereqRows.map((row) => ({
      id: row.id,
      fromCourseId: row.fromCourseId,
      toCourseId: row.toCourseId,
      minGrade: row.minGrade,
    })),
  };
}

const loadGraphPayloadCached = unstable_cache(
  async (releaseId: string) => {
    const fromNeon = await loadGraphPayloadFromNeon(releaseId);
    if (fromNeon) return fromNeon;
    const seed = buildArticulationGraphFromSeed(SEED_RELEASE_ID);
    return {
      releaseId: seed.releaseId,
      institutions: seed.institutions,
      courses: seed.courses,
      targetMajors: seed.targetMajors,
      rules: seed.rules,
      prerequisites: seed.prerequisites,
    } satisfies CachedGraphPayload;
  },
  ["waylo-articulation-graph-payload"],
  { tags: [ACTIVE_ACADEMIC_RELEASE_TAG], revalidate: false },
);

/**
 * Loads the active academic-data release into an immutable in-memory articulation graph.
 * Release id resolution is tagged for Next.js revalidation; the indexed graph is process-cached
 * so plan generation does not query Neon on every request.
 */
export async function loadActiveArticulationGraph(): Promise<ArticulationGraph> {
  const releaseId = await resolveActiveReleaseIdCached();
  if (processGraphCache?.releaseId === releaseId) return processGraphCache.graph;

  try {
    const payload = await loadGraphPayloadCached(releaseId);
    const graph = indexGraph(payload);
    processGraphCache = { releaseId: graph.releaseId, graph };
    return graph;
  } catch {
    const fallback = getSeedArticulationGraph();
    processGraphCache = { releaseId: fallback.releaseId, graph: fallback };
    return fallback;
  }
}
