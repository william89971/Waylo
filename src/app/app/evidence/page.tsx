import { ExternalLink } from "lucide-react";
import { EvidenceFocus } from "@/components/evidence-focus";
import { courses, evidence } from "@/lib/academic-data";

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
  const courseQuery = (await searchParams).course;
  const sources = evidence.filter((source) => source.pathwayId === "ucsd-data" || source.institutionId === "coc");
  const highlightIds = matchingSourceIds(courseQuery);
  const focusId = sources.find((source) => highlightIds.has(source.id))?.id;

  return (
    <div className="production-page evidence-page">
      <EvidenceFocus targetId={focusId ? `source-${focusId}` : undefined} />
      <header className="production-page-header">
        <h1>Evidence behind your plan</h1>
        <p>Every important academic claim carries its source and verification state.</p>
      </header>
      <div className="evidence-key" aria-label="Evidence status key">
        <span className="verified">Verified</span>
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
                  {source.status === "verified" ? "Verified source" : "Confirmation needed"}
                </span>
                <h2>{source.title}</h2>
                <p>{source.note}</p>
              </div>
              <dl>
                <div>
                  <dt>Effective period</dt>
                  <dd>{source.effectiveYear}</dd>
                </div>
                <div>
                  <dt>Retrieved</dt>
                  <dd>{source.retrievedAt}</dd>
                </div>
                <div>
                  <dt>Provenance</dt>
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
        <strong>Important limitation</strong>
        <p>
          Waylo validates internal prerequisite order and scheduling against its reviewed dataset. Exact COC-to-UCSD
          articulations still require confirmation in the applicable ASSIST agreement or with a counselor where marked.
        </p>
      </div>
    </div>
  );
}
