import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import {
  ARTICULATION_RULE_SEED,
  COC_CATALOG_SEED,
  INSTITUTION_SEED,
  PREREQUISITE_SEED,
  SEED_RELEASE_ID,
  TARGET_MAJOR_SEED,
} from "@/lib/articulation/seed-data";
import {
  ACTIVE_ACADEMIC_RELEASE_TAG,
  invalidateActiveArticulationGraphCache,
} from "@/lib/articulation/load-graph";
import type { ArticulationRule } from "@/lib/articulation/types";
import { getDatabase } from "@/lib/server/db/client";
import {
  academicDataReleases,
  articulationRules,
  catalogCourses,
  coursePrerequisites,
  institutions,
  targetMajors,
} from "@/lib/server/db/schema";

export interface PromoteReleaseInput {
  releaseId: string;
  rules: ArticulationRule[];
  activate?: boolean;
}

/**
 * Idempotently upserts the seed catalog into Neon.
 * Safe to re-run in production: every write uses ON CONFLICT DO UPDATE.
 */
export async function upsertSeedCatalog(releaseId = SEED_RELEASE_ID) {
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  await db
    .insert(academicDataReleases)
    .values({
      id: releaseId,
      pathwayId: null,
      effectiveYear: "2025-26",
      retrievedAt: new Date().toISOString().slice(0, 10),
      status: "draft",
      scope: "global",
      algorithmCompatibleVersion: "multi-target-csp-v1",
      sourceIds: ["seed-catalog"],
    })
    .onConflictDoUpdate({
      target: academicDataReleases.id,
      set: {
        effectiveYear: "2025-26",
        retrievedAt: new Date().toISOString().slice(0, 10),
        scope: "global",
        algorithmCompatibleVersion: "multi-target-csp-v1",
        sourceIds: ["seed-catalog"],
      },
    });

  for (const institution of INSTITUTION_SEED) {
    await db
      .insert(institutions)
      .values({
        id: institution.id,
        code: institution.code,
        name: institution.name,
        unitSystem: institution.unitSystem,
        recognizesIgetc: institution.recognizesIgetc,
        ingestionTier: institution.ingestionTier,
      })
      .onConflictDoUpdate({
        target: institutions.code,
        set: {
          id: institution.id,
          name: institution.name,
          unitSystem: institution.unitSystem,
          recognizesIgetc: institution.recognizesIgetc,
          ingestionTier: institution.ingestionTier,
        },
      });
  }

  for (const course of COC_CATALOG_SEED) {
    await db
      .insert(catalogCourses)
      .values({
        id: course.id,
        code: course.code,
        title: course.title,
        semesterUnits: course.semesterUnits,
        category: course.category,
        prerequisites: course.prerequisites,
        offeredTerms: course.offeredTerms,
        labPairCourseId: course.labPairCourseId ?? null,
        releaseId,
      })
      .onConflictDoUpdate({
        target: [catalogCourses.code, catalogCourses.releaseId],
        set: {
          id: course.id,
          title: course.title,
          semesterUnits: course.semesterUnits,
          category: course.category,
          prerequisites: course.prerequisites,
          offeredTerms: course.offeredTerms,
          labPairCourseId: course.labPairCourseId ?? null,
        },
      });
  }

  for (const major of TARGET_MAJOR_SEED) {
    await db
      .insert(targetMajors)
      .values({
        id: major.id,
        institutionId: major.institutionId,
        major: major.major,
        displayName: major.displayName,
        degree: major.degree,
        coverageTier: major.coverageTier,
        constraintNotes: major.constraintNotes,
        releaseId,
      })
      .onConflictDoUpdate({
        target: targetMajors.id,
        set: {
          institutionId: major.institutionId,
          major: major.major,
          displayName: major.displayName,
          degree: major.degree,
          coverageTier: major.coverageTier,
          constraintNotes: major.constraintNotes,
          releaseId,
        },
      });
  }

  for (const edge of PREREQUISITE_SEED) {
    await db
      .insert(coursePrerequisites)
      .values({
        id: edge.id,
        fromCourseId: edge.fromCourseId,
        toCourseId: edge.toCourseId,
        minGrade: edge.minGrade,
        releaseId,
      })
      .onConflictDoUpdate({
        target: coursePrerequisites.id,
        set: {
          fromCourseId: edge.fromCourseId,
          toCourseId: edge.toCourseId,
          minGrade: edge.minGrade,
          releaseId,
        },
      });
  }

  return {
    releaseId,
    institutions: INSTITUTION_SEED.length,
    courses: COC_CATALOG_SEED.length,
    majors: TARGET_MAJOR_SEED.length,
  };
}

export async function upsertArticulationRules(releaseId: string, rules: ArticulationRule[]) {
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  for (const rule of rules) {
    await db
      .insert(articulationRules)
      .values({
        id: rule.id,
        targetMajorId: rule.targetMajorId,
        requirementKey: rule.requirementKey,
        label: rule.label,
        fulfillmentExpression: rule.expression as unknown as Record<string, unknown>,
        verificationTier: rule.verificationTier,
        sourceType: rule.sourceType,
        sourceUrl: rule.sourceUrl,
        effectiveYear: rule.effectiveYear,
        notes: rule.notes,
        releaseId,
      })
      .onConflictDoUpdate({
        target: articulationRules.id,
        set: {
          targetMajorId: rule.targetMajorId,
          requirementKey: rule.requirementKey,
          label: rule.label,
          fulfillmentExpression: rule.expression as unknown as Record<string, unknown>,
          verificationTier: rule.verificationTier,
          sourceType: rule.sourceType,
          sourceUrl: rule.sourceUrl,
          effectiveYear: rule.effectiveYear,
          notes: rule.notes,
          releaseId,
        },
      });
  }

  return { releaseId, rules: rules.length };
}

/** Promote a draft release to active and invalidate graph caches. */
export async function activateAcademicRelease(releaseId: string) {
  const db = getDatabase();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  await db.execute(
    sql`update academic_data_releases set status = 'retired' where status = 'active' and id <> ${releaseId}`,
  );
  await db
    .insert(academicDataReleases)
    .values({
      id: releaseId,
      pathwayId: null,
      effectiveYear: "2025-26",
      retrievedAt: new Date().toISOString().slice(0, 10),
      status: "active",
      scope: "global",
      algorithmCompatibleVersion: "multi-target-csp-v1",
      sourceIds: ["seed-catalog"],
    })
    .onConflictDoUpdate({
      target: academicDataReleases.id,
      set: { status: "active", retrievedAt: new Date().toISOString().slice(0, 10) },
    });

  invalidateActiveArticulationGraphCache();
  revalidateTag(ACTIVE_ACADEMIC_RELEASE_TAG, "max");
}

export async function promoteSeedRelease(options: { activate?: boolean } = {}) {
  const releaseId = SEED_RELEASE_ID;
  await upsertSeedCatalog(releaseId);
  await upsertArticulationRules(releaseId, ARTICULATION_RULE_SEED);
  if (options.activate !== false) await activateAcademicRelease(releaseId);
  return { releaseId, activated: options.activate !== false };
}

export async function promoteIngestedRules(input: PromoteReleaseInput) {
  await upsertSeedCatalog(input.releaseId);
  await upsertArticulationRules(input.releaseId, input.rules);
  if (input.activate) await activateAcademicRelease(input.releaseId);
  return { releaseId: input.releaseId, rules: input.rules.length, activated: Boolean(input.activate) };
}
