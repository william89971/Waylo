import type { AdvisorSummary, TranscriptExtraction } from "@/lib/domain";

export const seededTranscriptExtraction: TranscriptExtraction = {
  sourceType: "seeded",
  overallConfidence: 0.91,
  reviewFlags: [
    "Calculus I course identity is readable, but its exact articulation remains a counselor-review item.",
  ],
  courses: [
    { sourceCode: "ENGL 101", sourceTitle: "Academic Reading and Writing", normalizedCourseId: "coc-engl-c1000", units: 4, grade: "A", term: "Fall 2025", confidence: 0.99, reviewRequired: false, reviewReason: null },
    { sourceCode: "MATH 211", sourceTitle: "Calculus I", normalizedCourseId: "coc-math-211", units: 5, grade: "B+", term: "Spring 2026", confidence: 0.84, reviewRequired: true, reviewReason: "Confirm the current institution-to-institution articulation in ASSIST." },
    { sourceCode: "COMP SCI 111", sourceTitle: "Introduction to Algorithms and Programming: Java", normalizedCourseId: "coc-compsci-111", units: 4, grade: "A-", term: "Spring 2026", confidence: 0.96, reviewRequired: false, reviewReason: null },
  ],
};

export const seededAdvisorSummary: AdvisorSummary = {
  currentPosition: "College of the Canyons with completed general education, programming, and early mathematics coursework.",
  destination: "UC Berkeley Data Science B.A.",
  routeStrategy: "Fastest valid route",
  estimatedTransferTerm: "Fall 2028",
  milestones: ["Confirm current ASSIST articulations", "Complete the calculus sequence in prerequisite order", "Finish programming and statistics preparation"],
  verifiedFacts: ["The displayed course order passes Waylo's deterministic prerequisite checks.", "The selected route stays within the configured unit limit."],
  reviewItems: ["Exact course-to-course articulation must be rechecked in ASSIST for the applicable academic year.", "Future term offerings are known only where the College of the Canyons dataset provides them."],
  questionsForCounselor: ["Do the current ASSIST agreements confirm each displayed equivalency?", "Does this workload fit the student's other commitments?", "Are any destination-specific breadth requirements missing from the current V1 coverage?"],
  disclaimer: "Waylo is a planning aid, not an admission guarantee. Review this plan with a counselor before enrollment decisions.",
};
