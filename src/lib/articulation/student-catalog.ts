import { courses as academicCourses } from "@/lib/academic-data";
import { AP_EXAMS } from "@/lib/articulation/external-credit";
import { getSeedArticulationGraph } from "@/lib/articulation/graph";

export type StudentCatalogCourse = {
  id: string;
  code: string;
  title: string;
  units: number;
  group: "coc" | "ap";
};

export function productionStudentCatalog(): StudentCatalogCourse[] {
  const graph = getSeedArticulationGraph();
  const seen = new Set<string>();
  const rows: StudentCatalogCourse[] = [];

  for (const course of academicCourses.filter((item) => item.institutionId === "coc")) {
    seen.add(course.id);
    rows.push({ id: course.id, code: course.code, title: course.title, units: course.units, group: "coc" });
  }

  for (const course of graph.courses) {
    if (seen.has(course.id)) continue;
    seen.add(course.id);
    rows.push({
      id: course.id,
      code: course.code.replace(/-/g, " "),
      title: course.title,
      units: course.semesterUnits,
      group: "coc",
    });
  }

  rows.sort((left, right) => left.code.localeCompare(right.code));

  for (const exam of AP_EXAMS) {
    rows.push({ id: exam.id, code: exam.code, title: exam.title, units: 0, group: "ap" });
  }

  return rows;
}
