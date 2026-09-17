import { z } from "zod";
import { RouteCandidateSchema } from "@/lib/domain";
import type { MultiTargetPlanResult } from "@/lib/articulation/types";

export const OnboardingProfileSchema = z.object({
  preferredName: z.string().trim().min(1).max(80).default("Student"),
  currentTerm: z.string().trim().max(40).nullable().default(null),
  onboardingStep: z.number().int().min(1).max(4),
  onboardingCompleted: z.boolean().default(false),
});

export const ProductionCourseInputSchema = z.object({
  catalogCourseId: z.string().min(1),
  grade: z.string().trim().max(4).nullable().default(null),
  term: z.string().trim().min(1).max(40),
  status: z.enum(["completed", "in_progress"]),
  code: z.string().trim().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  units: z.number().min(0).max(20).optional(),
  source: z.enum(["manual", "transcript", "ap", "other_college", "petition"]).optional(),
});

export const ConfirmCoursesSchema = z.object({
  courses: z.array(ProductionCourseInputSchema).min(1).max(80),
});

export const PlanningPreferencesInputSchema = z.object({
  maxUnits: z.number().int().min(6).max(20),
  summerEnrollment: z.boolean(),
  weeklyWorkHours: z.number().int().min(0).max(80),
  targetTerm: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/).nullable().default(null),
});

export const TransferTargetsInputSchema = z.object({
  primaryTargetId: z.string().min(1),
  secondaryTargetIds: z.array(z.string().min(1)).max(3).default([]),
  includeSecondaryDivergence: z.boolean().default(true),
});

export const PlanActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate") }),
  z.object({ action: z.literal("save"), strategy: z.enum(["fastest", "overlap", "balanced"]) }),
  z.object({
    action: z.literal("choose_route"),
    maxUnits: z.number().int().min(6).max(20),
    summerEnrollment: z.boolean(),
    includeSecondaryDivergence: z.boolean(),
  }),
]);

export const SavedPlanSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  route: RouteCandidateSchema,
  algorithmVersion: z.string(),
  academicDataVersion: z.string(),
  evidenceState: z.enum(["verified", "needs_review"]),
  createdAt: z.string(),
  primaryTargetId: z.string().optional(),
  secondaryTargetIds: z.array(z.string()).optional(),
  multiTargetPlan: z.custom<MultiTargetPlanResult>().optional(),
});

export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type ProductionCourseInput = z.infer<typeof ProductionCourseInputSchema>;
export type ConfirmCoursesInput = z.infer<typeof ConfirmCoursesSchema>;
export type PlanningPreferencesInput = z.infer<typeof PlanningPreferencesInputSchema>;
export type TransferTargetsInput = z.infer<typeof TransferTargetsInputSchema>;
export type SavedPlan = z.infer<typeof SavedPlanSchema>;

export interface ProductionCourse extends ProductionCourseInput {
  id: string;
  code: string;
  title: string;
  units: number;
  matchStatus: "verified" | "partial" | "uncertain" | "unavailable";
  source: "manual" | "transcript" | "ap" | "other_college" | "petition";
}

export interface StudentWorkspaceRecord {
  userId: string;
  profile: OnboardingProfile;
  courses: ProductionCourse[];
  pathwayId: "ucsd-data";
  primaryTargetId: string;
  secondaryTargetIds: string[];
  includeSecondaryDivergence: boolean;
  coverageTier: "reviewed";
  preferences: PlanningPreferencesInput;
  activePlan?: SavedPlan;
}

export interface SelectableTarget {
  id: string;
  institutionId: string;
  institutionName: string;
  major: string;
  displayName: string;
  degree: string;
  coverageTier: string;
  recognizesIgetc: boolean;
  ingestionTier: "1" | "2";
  constraintNotes: string[];
}
