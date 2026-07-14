"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileQuestion, Mail, Route, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { alternateRoutesWithoutCourse, buildCounselorInquiry, evidenceForIssue } from "@/lib/evidence-actions";
import { courseById } from "@/lib/academic-data";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { Status } from "@/components/ui";
import type { RouteCandidate } from "@/lib/domain";

export function UncertaintyActionCard({ courseId, compact = false, route }: { courseId: string; compact?: boolean; route?: RouteCandidate }) {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const confirmCourse = useWorkspaceStore((state) => state.confirmCourse);
  const [panel, setPanel] = useState<"evidence" | "inquiry" | "alternate" | "confirm" | null>(null);
  const inquiry = useMemo(() => buildCounselorInquiry(courseId, workspace.profile.selectedPathwayId), [courseId, workspace.profile.selectedPathwayId]);
  const [draft, setDraft] = useState(inquiry.body);
  const sources = evidenceForIssue(courseId, workspace.profile.selectedPathwayId);
  const alternatives = alternateRoutesWithoutCourse(workspace.profile, courseId);
  const course = courseById.get(courseId);
  const confirmed = workspace.reviewResolutions.some((resolution) => resolution.courseId === courseId);
  const affectedRoute = route ?? workspace.plan?.routes.find((candidate) => candidate.id === workspace.activeRouteId) ?? workspace.plan?.routes[0];
  const affectedTerm = affectedRoute?.terms.find((term) => term.courses.some((candidate) => candidate.courseId === courseId));
  const dependentCount = affectedRoute?.terms.flatMap((term) => term.courses).filter((candidate) => courseById.get(candidate.courseId)?.prerequisites.includes(courseId)).length ?? 0;

  return (
    <section className={`uncertainty-card ${compact ? "compact" : ""}`} aria-label={`${course?.title ?? courseId} evidence actions`}>
      <div className="uncertainty-heading">
        <span className="uncertainty-icon"><FileQuestion size={19} /></span>
        <div>
          <h2>{course?.title ?? courseId} equivalency needs verification</h2>
          <p>{affectedTerm ? `${affectedRoute?.label} uses this match in ${affectedTerm.label}` : "The active route may rely on this match"}{dependentCount ? ` before ${dependentCount} dependent milestone${dependentCount === 1 ? "" : "s"}` : ""}. If it is not confirmed, Waylo must recalculate the timeline. Current articulation evidence remains unsettled.</p>
        </div>
        {confirmed ? <Status tone="planned" label="Counselor-confirmed" /> : null}
      </div>
      <div className="uncertainty-actions">
        <Button variant="outline" className="waylo-control" onClick={() => setPanel("evidence")}><ExternalLink data-icon="inline-start" />Review evidence</Button>
        <Button variant="outline" className="waylo-control" onClick={() => { setDraft(inquiry.body); setPanel("inquiry"); }}><Mail data-icon="inline-start" />Draft counselor inquiry</Button>
        <Button variant="outline" className="waylo-control" onClick={() => setPanel("alternate")}><Route data-icon="inline-start" />Explore alternate route</Button>
        <Button className="waylo-control" disabled={confirmed} onClick={() => setPanel("confirm")}><ShieldCheck data-icon="inline-start" />{confirmed ? "Counselor-confirmed" : "Mark as counselor-confirmed"}</Button>
      </div>

      <Sheet open={panel === "evidence"} onOpenChange={(open) => !open && setPanel(null)}>
        <SheetContent className="waylo-sheet sm:max-w-lg">
          <SheetHeader><SheetTitle>Evidence for {course?.code}</SheetTitle><SheetDescription>Source status and counselor confirmation are tracked separately.</SheetDescription></SheetHeader>
          <div className="sheet-scroll">
            {sources.map((source) => <article className="source-detail-card" key={source.id}><div className="title-row"><strong>{source.title}</strong><Status tone={source.status === "verified" ? "confirmed" : "warning"} label={source.status} /></div><p>{source.note}</p><dl><div><dt>Effective year</dt><dd>{source.effectiveYear}</dd></div><div><dt>Retrieved</dt><dd>{source.retrievedAt}</dd></div><div><dt>Source ID</dt><dd>{source.id}</dd></div></dl><a href={source.url} target="_blank" rel="noreferrer" className="text-link">Open official source <ExternalLink size={14} /></a></article>)}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={panel === "inquiry"} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent className="waylo-dialog sm:max-w-2xl">
          <DialogHeader><DialogTitle>{inquiry.subject}</DialogTitle><DialogDescription>Edit and copy this draft. It is not stored or sent by Waylo.</DialogDescription></DialogHeader>
          <Textarea aria-label="Counselor inquiry draft" className="inquiry-draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <p className="dialog-note">Cites {inquiry.evidenceIds.length} exact records and explicitly leaves the equivalency unsettled.</p>
          <DialogFooter><Button variant="outline" onClick={() => setPanel(null)}>Close</Button><Button onClick={() => navigator.clipboard?.writeText(draft)}>Copy draft</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={panel === "alternate"} onOpenChange={(open) => !open && setPanel(null)}>
        <DialogContent className="waylo-dialog sm:max-w-xl">
          <DialogHeader><DialogTitle>Routes that do not rely on this match</DialogTitle><DialogDescription>Waylo checks only the six supported pathway datasets and never invents an alternative.</DialogDescription></DialogHeader>
          <div className="alternate-list">{alternatives.length ? alternatives.map((item) => <div className="alternate-row" key={item.pathwayId}><div><strong>{item.label}</strong><span>{item.plan.routes.filter((route) => route.valid).length} validated strategies</span></div><Status tone="confirmed" label="Supported" /></div>) : <div className="empty-inline"><Route size={22} /><div><strong>No supported alternate avoids this match</strong><p>Review the current equivalency with a counselor or adjust the destination.</p></div></div>}</div>
          <DialogFooter><Button onClick={() => setPanel(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={panel === "confirm"} onOpenChange={(open) => !open && setPanel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Record counselor confirmation?</AlertDialogTitle><AlertDialogDescription>This records your report that a counselor confirmed the match. The underlying source remains partial or uncertain and will never be relabeled verified.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { confirmCourse(courseId); setPanel(null); }}>Record confirmation</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
