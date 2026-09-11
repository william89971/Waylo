import type {
  ArticulationExpression,
  ArticulationRule,
  CatalogCourse,
  CoursePrerequisite,
  Institution,
  TargetInstitution,
  TargetMajor,
  TargetMajorKey,
} from "@/lib/articulation/types";
import { targetMajorId } from "@/lib/articulation/types";

export const SEED_RELEASE_ID = "seed-articulation-2025-26.v1";

export const COC_CATALOG_SEED: CatalogCourse[] = [
  { id: "coc-math-140", code: "MATH-140", title: "Introductory Statistics", semesterUnits: 4, category: "math", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-math-211", code: "MATH-211", title: "Calculus I", semesterUnits: 5, category: "math", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-math-212", code: "MATH-212", title: "Calculus II", semesterUnits: 5, category: "math", prerequisites: ["coc-math-211"], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-math-213", code: "MATH-213", title: "Calculus III", semesterUnits: 5, category: "math", prerequisites: ["coc-math-212"], offeredTerms: ["fall", "spring"] },
  { id: "coc-math-214", code: "MATH-214", title: "Linear Algebra", semesterUnits: 4, category: "math", prerequisites: ["coc-math-212"], offeredTerms: ["fall", "spring"] },
  { id: "coc-math-215", code: "MATH-215", title: "Differential Equations", semesterUnits: 4, category: "math", prerequisites: ["coc-math-212"], offeredTerms: ["fall", "spring"] },
  { id: "coc-cmpsci-111", code: "CMPSCI-111", title: "Introduction to Algorithms & Programming: Java", semesterUnits: 3, category: "programming", prerequisites: [], offeredTerms: ["fall", "spring"], labPairCourseId: "coc-cmpsci-111l" },
  { id: "coc-cmpsci-111l", code: "CMPSCI-111L", title: "Java Programming Lab", semesterUnits: 1, category: "programming", prerequisites: [], offeredTerms: ["fall", "spring"], labPairCourseId: "coc-cmpsci-111" },
  { id: "coc-cmpsci-122", code: "CMPSCI-122", title: "Introduction to Data Structures", semesterUnits: 3, category: "programming", prerequisites: ["coc-cmpsci-111"], offeredTerms: ["fall", "spring"] },
  { id: "coc-cmpsci-182", code: "CMPSCI-182", title: "Data Structures & Program Design", semesterUnits: 3, category: "programming", prerequisites: ["coc-cmpsci-111"], offeredTerms: ["fall", "spring"] },
  { id: "coc-engr-152", code: "ENGR-152", title: "Statics", semesterUnits: 3, category: "science", prerequisites: ["coc-math-211"], offeredTerms: ["fall", "spring"] },
  { id: "coc-chem-201", code: "CHEM-201", title: "General Chemistry I", semesterUnits: 5, category: "science", prerequisites: [], offeredTerms: ["fall", "spring"] },
  { id: "coc-chem-202", code: "CHEM-202", title: "General Chemistry II", semesterUnits: 5, category: "science", prerequisites: ["coc-chem-201"], offeredTerms: ["fall", "spring"] },
  { id: "coc-chem-255", code: "CHEM-255", title: "Organic Chemistry I", semesterUnits: 5, category: "science", prerequisites: ["coc-chem-202"], offeredTerms: ["fall"] },
  { id: "coc-chem-256", code: "CHEM-256", title: "Organic Chemistry II", semesterUnits: 5, category: "science", prerequisites: ["coc-chem-255"], offeredTerms: ["spring"] },
  { id: "coc-physic-220", code: "PHYSIC-220", title: "Physics for Scientists & Engineers I", semesterUnits: 4, category: "science", prerequisites: ["coc-math-211"], offeredTerms: ["fall", "spring"] },
  { id: "coc-physic-221", code: "PHYSIC-221", title: "Physics for Scientists & Engineers II", semesterUnits: 4, category: "science", prerequisites: ["coc-physic-220", "coc-math-212"], offeredTerms: ["fall", "spring"] },
  { id: "coc-physic-222", code: "PHYSIC-222", title: "Physics for Scientists & Engineers III", semesterUnits: 4, category: "science", prerequisites: ["coc-physic-221"], offeredTerms: ["fall", "spring"] },
  { id: "coc-biosci-106", code: "BIOSCI-106", title: "Organismal & Environmental Biology", semesterUnits: 4, category: "science", prerequisites: [], offeredTerms: ["fall", "spring"] },
  { id: "coc-biosci-107", code: "BIOSCI-107", title: "Molecular & Cellular Biology", semesterUnits: 4, category: "science", prerequisites: [], offeredTerms: ["fall", "spring"] },
  { id: "coc-biosci-201", code: "BIOSCI-201", title: "Introduction to Human Anatomy", semesterUnits: 4, category: "science", prerequisites: ["coc-biosci-107"], offeredTerms: ["fall", "spring"] },
  { id: "coc-biosci-202", code: "BIOSCI-202", title: "Introduction to Human Physiology", semesterUnits: 4, category: "science", prerequisites: ["coc-biosci-201"], offeredTerms: ["fall", "spring"] },
  { id: "coc-econ-201", code: "ECON-201", title: "Macroeconomics", semesterUnits: 3, category: "major", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-econ-202", code: "ECON-202", title: "Microeconomics", semesterUnits: 3, category: "major", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-bus-201", code: "BUS-201", title: "Principles of Accounting I", semesterUnits: 5, category: "major", prerequisites: [], offeredTerms: ["fall", "spring"] },
  { id: "coc-psych-101", code: "PSYCH-101", title: "Introduction to Psychology", semesterUnits: 3, category: "major", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-psych-102", code: "PSYCH-102", title: "Physiological Psychology", semesterUnits: 3, category: "major", prerequisites: ["coc-psych-101"], offeredTerms: ["fall", "spring"] },
  { id: "coc-psych-103", code: "PSYCH-103", title: "Introduction to Behavioral Research Methods", semesterUnits: 3, category: "major", prerequisites: ["coc-psych-101"], offeredTerms: ["fall", "spring"] },
  { id: "coc-psych-104", code: "PSYCH-104", title: "Statistics for the Social Sciences", semesterUnits: 3, category: "major", prerequisites: ["coc-psych-101"], offeredTerms: ["fall", "spring"] },
  { id: "coc-engl-101", code: "ENGL-101", title: "English Composition", semesterUnits: 3, category: "general", prerequisites: [], offeredTerms: ["fall", "spring", "summer"] },
  { id: "coc-engl-103", code: "ENGL-103", title: "Critical Reading, Writing and Thinking", semesterUnits: 3, category: "general", prerequisites: ["coc-engl-101"], offeredTerms: ["fall", "spring"] },
];

export const INSTITUTION_SEED: Institution[] = [
  { id: "uc_berkeley", code: "UCB", name: "UC Berkeley", unitSystem: "semester", recognizesIgetc: true, ingestionTier: "1" },
  { id: "ucla", code: "UCLA", name: "UCLA", unitSystem: "quarter", recognizesIgetc: true, ingestionTier: "1" },
  { id: "uc_san_diego", code: "UCSD", name: "UC San Diego", unitSystem: "quarter", recognizesIgetc: true, ingestionTier: "1" },
  { id: "usc", code: "USC", name: "University of Southern California", unitSystem: "semester", recognizesIgetc: false, ingestionTier: "1" },
  { id: "stanford", code: "STAN", name: "Stanford University", unitSystem: "quarter", recognizesIgetc: false, ingestionTier: "2" },
  { id: "cornell", code: "CORN", name: "Cornell University", unitSystem: "semester", recognizesIgetc: false, ingestionTier: "2" },
  { id: "harvard", code: "HARV", name: "Harvard College", unitSystem: "semester", recognizesIgetc: false, ingestionTier: "2" },
];

function major(
  institution: TargetInstitution,
  majorKey: TargetMajorKey,
  displayName: string,
  degree: TargetMajor["degree"],
  coverageTier: TargetMajor["coverageTier"],
  constraintNotes: string[],
): TargetMajor {
  return {
    id: targetMajorId(institution, majorKey),
    institutionId: institution,
    major: majorKey,
    displayName,
    degree,
    coverageTier,
    constraintNotes,
  };
}

export const TARGET_MAJOR_SEED: TargetMajor[] = [
  major("uc_berkeley", "economics", "Economics", "B.A.", "reviewed", ["Complete major prep by the spring before fall matriculation."]),
  major("uc_berkeley", "data_science", "Data Science", "B.A.", "reviewed", ["Calc I–II and linear algebra before transfer."]),
  major("uc_berkeley", "psychology", "Psychology", "B.A.", "reviewed", []),
  major("ucla", "economics", "Pre-Economics", "B.A.", "reviewed", ["Selective pre-major GPA gates apply."]),
  major("ucla", "business_administration", "Pre-Business Economics", "B.A.", "reviewed", ["Pre-major GPA minimums are selective."]),
  major("ucla", "psychology", "Psychology", "B.A.", "reviewed", []),
  major("ucla", "data_science", "Statistics & Data Science", "B.S.", "reviewed", []),
  major("uc_san_diego", "data_science", "Data Science", "B.S.", "full", ["Production baseline pathway."]),
  major("uc_san_diego", "bioengineering", "Bioengineering", "B.S.", "reviewed", ["Chemistry series must be completed as a series."]),
  major("uc_san_diego", "psychology", "Psychology", "B.S.", "reviewed", []),
  major("usc", "business_administration", "Business Administration (Marshall)", "B.S.B.A.", "reviewed", ["IGETC does not clear USC foreign language or diversity."]),
  major("usc", "bioengineering", "Biomedical Engineering (Viterbi)", "B.S.", "reviewed", []),
  major("usc", "economics", "Economics (Dornsife)", "B.A.", "reviewed", []),
  major("stanford", "data_science", "Data Science (Foundational Profile)", "B.S.", "archetype", ["No formal ASSIST agreement. IGETC is not recognized."]),
  major("stanford", "economics", "Economics (Foundational Profile)", "B.A.", "archetype", []),
  major("cornell", "economics", "Economics (Foundational Profile)", "B.A.", "archetype", ["IGETC is not recognized."]),
  major("cornell", "bioengineering", "Biological Engineering (Foundational Profile)", "B.S.", "archetype", []),
  major("harvard", "economics", "Economics (Foundational Profile)", "B.A.", "archetype", ["IGETC is not recognized."]),
  major("harvard", "psychology", "Psychology (Foundational Profile)", "B.A.", "archetype", []),
];

export const PREREQUISITE_SEED: CoursePrerequisite[] = COC_CATALOG_SEED.flatMap((course) =>
  course.prerequisites.map((fromCourseId, index) => ({
    id: `prereq-${course.id}-${index}`,
    fromCourseId,
    toCourseId: course.id,
    minGrade: "C",
  })),
);

const course = (courseCode: string): ArticulationExpression => ({ type: "COURSE", courseCode });
const and = (...codes: string[]): ArticulationExpression => ({ type: "AND", clauses: codes.map(course) });
const or = (...codes: string[]): ArticulationExpression => ({ type: "OR", clauses: codes.map(course) });
const series = (seriesId: string, ...courses: string[]): ArticulationExpression => ({
  type: "SERIES_COMPLETE",
  seriesId,
  courses,
});

function rule(
  id: string,
  institution: TargetInstitution,
  majorKey: TargetMajorKey,
  requirementKey: string,
  label: string,
  expression: ArticulationExpression,
  verificationTier: ArticulationRule["verificationTier"],
  sourceType: ArticulationRule["sourceType"],
  sourceUrl: string,
  notes: string,
): ArticulationRule {
  return {
    id,
    targetMajorId: targetMajorId(institution, majorKey),
    requirementKey,
    label,
    expression,
    verificationTier,
    sourceType,
    sourceUrl,
    effectiveYear: "2025-26",
    notes,
  };
}

export const ARTICULATION_RULE_SEED: ArticulationRule[] = [
  rule("rule-ucb-econ-calc1", "uc_berkeley", "economics", "calc-1", "Calculus I", course("MATH-211"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucb-econ-calc2", "uc_berkeley", "economics", "calc-2", "Calculus II", course("MATH-212"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucb-econ-macro", "uc_berkeley", "economics", "macro", "Macroeconomics", course("ECON-201"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucb-econ-micro", "uc_berkeley", "economics", "micro", "Microeconomics", course("ECON-202"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucb-econ-stats", "uc_berkeley", "economics", "stats", "Statistics", or("MATH-140", "PSYCH-104"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucb-econ-writing", "uc_berkeley", "economics", "writing", "English composition sequence", series("engl-comp", "ENGL-101", "ENGL-103"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),

  rule("rule-ucla-bus-calc1", "ucla", "business_administration", "calc-1", "Calculus I", course("MATH-211"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucla-bus-calc2", "ucla", "business_administration", "calc-2", "Calculus II", course("MATH-212"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucla-bus-macro", "ucla", "business_administration", "macro", "Macroeconomics", course("ECON-201"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucla-bus-micro", "ucla", "business_administration", "micro", "Microeconomics", course("ECON-202"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucla-bus-stats", "ucla", "business_administration", "stats", "Statistics", course("MATH-140"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),

  rule("rule-ucsd-ds-calc1", "uc_san_diego", "data_science", "calc-1", "Calculus I", course("MATH-211"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-ds-calc2", "uc_san_diego", "data_science", "calc-2", "Calculus II", course("MATH-212"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-ds-calc3", "uc_san_diego", "data_science", "calc-3", "Calculus III", course("MATH-213"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-ds-linear", "uc_san_diego", "data_science", "linear", "Linear Algebra", course("MATH-214"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-ds-prog", "uc_san_diego", "data_science", "programming", "Introductory programming + lab", and("CMPSCI-111", "CMPSCI-111L"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", "Lecture and lab co-requisite bundle."),

  rule("rule-ucsd-bioe-chem", "uc_san_diego", "bioengineering", "gen-chem", "General Chemistry series", series("chem-gen", "CHEM-201", "CHEM-202"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", "Partial series yields zero major-prep credit."),
  rule("rule-ucsd-bioe-calc1", "uc_san_diego", "bioengineering", "calc-1", "Calculus I", course("MATH-211"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-bioe-calc2", "uc_san_diego", "bioengineering", "calc-2", "Calculus II", course("MATH-212"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),
  rule("rule-ucsd-bioe-phys", "uc_san_diego", "bioengineering", "physics", "Physics series", series("phys-sci", "PHYSIC-220", "PHYSIC-221"), "VERIFIED_ASSIST", "assist_public", "https://assist.org/", ""),

  rule("rule-usc-bus-calc", "usc", "business_administration", "calc", "Calculus / quantitative", or("MATH-211", "MATH-140"), "VERIFIED_INSTITUTIONAL_GUIDE", "institutional_guide", "https://arr.usc.edu/transfercredit/", "Prefer MATH-211 when overlapping UC calc requirements."),
  rule("rule-usc-bus-macro", "usc", "business_administration", "macro", "Macroeconomics", course("ECON-201"), "VERIFIED_INSTITUTIONAL_GUIDE", "institutional_guide", "https://arr.usc.edu/transfercredit/", ""),
  rule("rule-usc-bus-micro", "usc", "business_administration", "micro", "Microeconomics", course("ECON-202"), "VERIFIED_INSTITUTIONAL_GUIDE", "institutional_guide", "https://arr.usc.edu/transfercredit/", ""),
  rule("rule-usc-bus-acct", "usc", "business_administration", "accounting", "Financial Accounting", course("BUS-201"), "VERIFIED_INSTITUTIONAL_GUIDE", "institutional_guide", "https://arr.usc.edu/transfercredit/", "Secondary divergence vs UC L&S Economics."),
  rule("rule-usc-bus-writing", "usc", "business_administration", "writing", "Writing", course("ENGL-101"), "VERIFIED_INSTITUTIONAL_GUIDE", "institutional_guide", "https://arr.usc.edu/transfercredit/", ""),
  rule("rule-usc-bus-fl", "usc", "business_administration", "foreign-language", "Foreign language / diversity", course("NEEDS-COUNSELOR"), "NEEDS_COUNSELOR_CONFIRMATION", "institutional_guide", "https://arr.usc.edu/transfercredit/", "IGETC does not fulfill USC FL or diversity."),

  rule("rule-stanford-ds-calc", "stanford", "data_science", "calc-sequence", "Complete calculus sequence", series("calc-full", "MATH-211", "MATH-212", "MATH-213", "MATH-214"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", "Foundational competency profile."),
  rule("rule-stanford-ds-writing", "stanford", "data_science", "composition", "College composition", series("comp", "ENGL-101", "ENGL-103"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", ""),
  rule("rule-cornell-econ-calc", "cornell", "economics", "calc-sequence", "Complete calculus sequence", series("calc-full", "MATH-211", "MATH-212", "MATH-213", "MATH-214"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", ""),
  rule("rule-cornell-econ-writing", "cornell", "economics", "composition", "College composition", series("comp", "ENGL-101", "ENGL-103"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", ""),
  rule("rule-harvard-econ-calc", "harvard", "economics", "calc-sequence", "Complete calculus sequence", series("calc-full", "MATH-211", "MATH-212", "MATH-213", "MATH-214"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", ""),
  rule("rule-harvard-econ-writing", "harvard", "economics", "composition", "College composition", series("comp", "ENGL-101", "ENGL-103"), "PLANNING_SUGGESTION", "departmental_precedent", "https://waylo.local/archetypes/private", ""),
];
