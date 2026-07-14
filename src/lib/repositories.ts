import { courseById, courses, evidence, evidenceById, programById, programs } from "@/lib/academic-data";
import type { CourseDefinition, EvidenceReference, Program } from "@/lib/domain";

export interface AcademicDataRepository {
  listPrograms(): Program[];
  getProgram(id: string): Program | undefined;
  listCourses(): CourseDefinition[];
  getCourse(id: string): CourseDefinition | undefined;
}

export interface EvidenceRepository {
  list(): EvidenceReference[];
  get(id: string): EvidenceReference | undefined;
  resolve(ids: string[]): EvidenceReference[];
}

export const academicDataRepository: AcademicDataRepository = {
  listPrograms: () => programs,
  getProgram: (id) => programById.get(id),
  listCourses: () => courses,
  getCourse: (id) => courseById.get(id),
};

export const evidenceRepository: EvidenceRepository = {
  list: () => evidence,
  get: (id) => evidenceById.get(id),
  resolve: (ids) => ids.map((id) => evidenceById.get(id)).filter((item): item is EvidenceReference => Boolean(item)),
};
