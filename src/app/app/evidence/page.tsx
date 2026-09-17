import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { EvidenceFocus } from "@/components/evidence-focus";
import { courses, evidence } from "@/lib/academic-data";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { studentRepository } from "@/lib/server/student-repository";

function matchingSourceIds(courseQuery?: string) {
  if (!courseQuery) return new Set<string>();
  const query = courseQuery.trim();
  const catalog = courses.find((course) => {
    const compactCode = course.code.replace(/\s+/g, "");
    const compactQuery = query.replace(/[-\s]/g, "");
    return (
      course.id === query ||
      course.code === query ||
      course.code.replace(/\s+/g, "-") === query ||
      compactCode.toLowerCase() === compactQuery.toLowerCase()
    );
  });
  if (catalog) return new Set(catalog.evidenceIds);
  if (evidence.some((source) => source.id === query)) return new Set([query]);
  const needle = query.toLowerCase().replace(/-/g, " ");
  return new Set(
    evidence
      .filter(
        (source) =>
          source.title.toLowerCase().includes(needle) ||
          source.note.toLowerCase().includes(needle) ||
          source.id.toLowerCase().replace(/-/g, " ").includes(needle),
      )
      .map((source) => source.id),
  );
}

export default async function EvidencePage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const clerkUserId = await getAuthenticatedUserId();
  if (!clerkUserId) redirect("/sign-in");
  const workspace = await studentRepository.load(clerkUserId);
  const courseQuery = (await searchParams).course;
  if (workspace.profile.onboardingCompleted) {
    const focus = courseQuery ? `?course=${encodeURIComponent(courseQuery)}` : "";
    redirect(`/app/plan${focus}`);
  }
  const sources = evidence.filter((source) => source.pathwayId === "ucsd-data" || source.institutionId === "coc");
  const highlightIds = matchingSourceIds(courseQuery);
  const focusId = sources.find((source) => highlightIds.has(source.id))?.id;

  return (
    <div className="production-page evidence-page">
      <EvidenceFocus targetId={focusId ? `source-${focusId}` : undefined} />
      <header className="production-page-header">
        <h1>Evidence behind your plan</h1>
        <p>
          ASSIST is the official California site for UC and CSU transfer agreements. Each item below is a source Waylo
          used. If it says a counselor is needed, confirm it before you enroll.
        </p>
      </header>
      <div className="evidence-key" aria-label="Evidence status key">
        <span className="verified">Official source</span>
        <span className="suggestion">Planning suggestion</span>
        <span className="review">ASSIST or counselor confirmation needed</span>
      </div>
      <div className="evidence-list">
        {sources.map((source) => {
          const highlighted = highlightIds.has(source.id);
          return (
            <article
              key={source.id}
              id={`source-${source.id}`}
              className={highlighted ? "evidence-focus" : undefined}
              data-highlighted={highlighted ? "true" : undefined}
            >
              <div>
                <span className={`source-status ${source.status}`}>
                  {source.status === "verified" ? "Official source" : "Ask a counselor"}
                </span>
                <h2>{source.title}</h2>
                <p>{source.note}</p>
              </div>
              <dl>
                <div>
                  <dt>Agreement year</dt>
                  <dd>{source.effectiveYear}</dd>
                </div>
                <div>
                  <dt>Checked</dt>
                  <dd>{source.retrievedAt}</dd>
                </div>
                <div>
                  <dt>Where it came from</dt>
                  <dd>{source.provenance.replaceAll("_", " ")}</dd>
                </div>
              </dl>
              <a href={source.url} target="_blank" rel="noreferrer">
                Open official source <ExternalLink aria-hidden="true" />
              </a>
            </article>
          );
        })}
      </div>
      <div className="evidence-disclaimer">
        <strong>Waylo does not replace a counselor</strong>
        <p>
          This list explains the sources behind your next-semester plan. Confirm anything marked for review in ASSIST
          or with a College of the Canyons counselor before you enroll.
        </p>
      </div>
    </div>
  );
}
