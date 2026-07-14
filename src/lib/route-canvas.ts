import { courseById } from "@/lib/academic-data";
import type { EvidenceReviewResolution, RouteCandidate, RouteCanvasEdge, RouteCanvasNode, RouteCanvasState } from "@/lib/domain";

const TERM_WIDTH = 220;
const TERM_GAP = 76;
const LEFT_GUTTER = 170;
const TOP_GUTTER = 80;
const COURSE_HEIGHT = 54;

function courseState(courseId: string, route: RouteCandidate, resolutions: EvidenceReviewResolution[], canvasState: "baseline" | "proposed" | "repaired"): RouteCanvasNode["state"] {
  if (canvasState === "proposed" && !route.valid) return "rejected";
  if (canvasState === "repaired") return "repaired";
  if (resolutions.some((resolution) => resolution.courseId === courseId)) return "counselor-confirmed";
  if (courseById.get(courseId)?.evidenceIds.includes("assist-review")) return "uncertain";
  return "verified";
}

export interface RouteCanvasBuildOptions {
  state?: "baseline" | "proposed" | "repaired";
  reviewResolutions?: EvidenceReviewResolution[];
  originLabel?: string;
  destinationLabel?: string;
}

export function buildRouteCanvasModel(route: RouteCandidate, options: RouteCanvasBuildOptions = {}): RouteCanvasState {
  const state = options.state ?? "baseline";
  const reviewResolutions = options.reviewResolutions ?? [];
  const maxCourses = Math.max(1, ...route.terms.map((term) => term.courses.length));
  const height = TOP_GUTTER + maxCourses * (COURSE_HEIGHT + 16) + 150;
  const width = LEFT_GUTTER + route.terms.length * (TERM_WIDTH + TERM_GAP) + 240;
  const nodes: RouteCanvasNode[] = [];
  const edges: RouteCanvasEdge[] = [];
  const courseNodeById = new Map<string, RouteCanvasNode>();

  nodes.push({
    id: `position-${route.id}`,
    type: "current_position",
    label: "Current position",
    detail: options.originLabel ?? "College of the Canyons",
    x: 20,
    y: TOP_GUTTER + 38,
    width: 132,
    height: 66,
    state: "verified",
    evidenceIds: [],
  });

  route.terms.forEach((term, termIndex) => {
    const x = LEFT_GUTTER + termIndex * (TERM_WIDTH + TERM_GAP);
    nodes.push({
      id: `term-${route.id}-${term.id}`,
      type: "semester",
      label: term.label,
      detail: `${term.totalUnits} units`,
      x,
      y: 18,
      width: TERM_WIDTH,
      height: 46,
      state: state === "repaired" ? "repaired" : state === "proposed" ? "proposed" : "verified",
      termId: term.id,
      evidenceIds: [],
    });
    term.courses.forEach((course, courseIndex) => {
      const node: RouteCanvasNode = {
        id: `course-${route.id}-${course.courseId}`,
        type: "course",
        label: course.code,
        detail: course.title,
        x,
        y: TOP_GUTTER + courseIndex * (COURSE_HEIGHT + 16),
        width: TERM_WIDTH,
        height: COURSE_HEIGHT,
        state: courseState(course.courseId, route, reviewResolutions, state),
        termId: term.id,
        courseId: course.courseId,
        evidenceIds: course.evidenceIds,
      };
      nodes.push(node);
      courseNodeById.set(course.courseId, node);
      edges.push({ id: `satisfies-${node.id}`, type: "satisfies", from: `term-${route.id}-${term.id}`, to: node.id, label: "scheduled in", state: node.state });
    });
  });

  for (const [courseId, node] of courseNodeById) {
    const definition = courseById.get(courseId);
    for (const prerequisiteId of definition?.prerequisites ?? []) {
      const prerequisite = courseNodeById.get(prerequisiteId);
      if (!prerequisite) continue;
      const broken = prerequisite.x >= node.x;
      edges.push({
        id: `prerequisite-${prerequisiteId}-${courseId}`,
        type: "prerequisite",
        from: prerequisite.id,
        to: node.id,
        label: "prerequisite",
        state: broken ? "broken" : state === "repaired" ? "repaired" : node.state,
      });
    }
  }

  const destinationX = LEFT_GUTTER + route.terms.length * (TERM_WIDTH + TERM_GAP) - 10;
  nodes.push({
    id: `destination-${route.id}`,
    type: "destination",
    label: route.estimatedTransferTerm,
    detail: options.destinationLabel ?? "Transfer milestone",
    x: destinationX,
    y: TOP_GUTTER + 38,
    width: 200,
    height: 70,
    state: route.valid ? (state === "repaired" ? "repaired" : "verified") : "broken",
    evidenceIds: route.evidenceIds,
  });
  const lastTerm = route.terms.at(-1);
  if (lastTerm) edges.push({ id: `destination-edge-${route.id}`, type: "branch", from: `term-${route.id}-${lastTerm.id}`, to: `destination-${route.id}`, label: "transfer after", state: route.valid ? "verified" : "broken" });

  return { routeId: route.id, label: route.label, estimatedTransferTerm: route.estimatedTransferTerm, width, height, nodes, edges, valid: route.valid };
}
