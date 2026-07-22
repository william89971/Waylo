import { z } from "zod";
import { RouteCandidateSchema } from "@/lib/domain";

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
});

export const PlanningPreferencesInputSchema = z.object({
  maxUnits: z.number().int().min(6).max(20),
  summerEnrollment: z.boolean(),
  weeklyWorkHours: z.number().int().min(0).max(80),
  targetTerm: z.string().regex(/^(Fall|Spring|Summer) \d{4}$/).nullable().default(null),
});

export const PlanActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate") }),
  z.object({ action: z.literal("save"), strategy: z.enum(["fastest", "overlap", "balanced"]) }),
]);

export const SavedPlanSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  route: RouteCandidateSchema,
  algorithmVersion: z.string(),
  academicDataVersion: z.string(),
  evidenceState: z.enum(["verified", "needs_review"]),
  createdAt: z.string(),
});

export type OnboardingProfile = z.infer<typeof OnboardingProfileSchema>;
export type ProductionCourseInput = z.infer<typeof ProductionCourseInputSchema>;
export type PlanningPreferencesInput = z.infer<typeof PlanningPreferencesInputSchema>;
export type SavedPlan = z.infer<typeof SavedPlanSchema>;

export interface ProductionCourse extends ProductionCourseInput {
  id: string;
  code: string;
  title: string;
  units: number;
  matchStatus: "verified" | "partial" | "uncertain" | "unavailable";
}

export interface StudentWorkspaceRecord {
  userId: string;
  profile: OnboardingProfile;
  courses: ProductionCourse[];
  pathwayId: "ucsd-data";
  coverageTier: "reviewed";
  preferences: PlanningPreferencesInput;
  activePlan?: SavedPlan;
}
