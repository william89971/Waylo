import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { constraintsFromProfile } from "@/lib/academic-twin";
import { seedProfile } from "@/lib/academic-data";
import { parseSeededPlanCommand } from "@/lib/plan-command";
import { planningEngine } from "@/lib/planning-engine";
import { simulationEngine } from "@/lib/simulation-engine";

const landingConstraints = constraintsFromProfile(seedProfile);
const landingPlan = planningEngine.buildPlan(seedProfile, seedProfile.selectedPathwayId, {
  includeSummer: landingConstraints.summerEnrollment,
  summerCourseLimit: landingConstraints.summerCourseLimit,
  maxUnits: landingConstraints.maxUnits,
  weeklyWorkHours: landingConstraints.weeklyWorkHours,
});
const landingRoute = landingPlan.routes[0];
const landingInterpretation = parseSeededPlanCommand("I may have to drop Calculus I. Show me what changes.", { activeRoute: landingRoute, selectedPathwayId: seedProfile.selectedPathwayId });
const landingConsequence = simulationEngine.applyChanges(seedProfile, landingInterpretation.changes, seedProfile.selectedPathwayId, landingRoute?.id, [], landingConstraints);
const consequenceMoves = landingConsequence.delta.courseMoves.slice(0, 4);

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link href="/" className="landing-brand">Waylo</Link>
        <Link href="/judge-tour?fresh=1" className="button primary">Start the 2-minute judge tour <ArrowRight size={17} /></Link>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <h1>See what changes before you change your plan.</h1>
          <p>Waylo turns transcripts, transfer requirements, and real-life constraints into validated academic routes you can review with a counselor.</p>
          <p className="landing-positioning">An evidence-grounded academic decision simulator for community-college transfer students.</p>
          <div className="cluster">
            <Link href="/judge-tour?fresh=1" className="button primary">Start the 2-minute judge tour <ArrowRight size={17} /></Link>
            <Link href="/overview" className="button">Open the full seeded app</Link>
          </div>
          <div className="landing-note"><ShieldCheck size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Seeded College of the Canyons example. Recorded GPT-5.6 demo results are labeled. No OpenAI request is made in the judge tour.</div>
        </div>
        <div className="landing-preview panel" role="region" aria-label="Academic Twin consequence preview">
          <div className="preview-bar"><span className="preview-title">One course change, fully traced</span><span className="status confirmed"><span className="status-icon"><Check size={14} /></span>Baseline protected</span></div>
          <div className="preview-before-after" aria-label={`Transfer estimate changes from ${landingConsequence.delta.baselineTransferTerm} to ${landingConsequence.delta.simulatedTransferTerm}`}>
            <div><small>Before</small><strong>{landingConsequence.delta.baselineTransferTerm}</strong></div>
            <ArrowRight aria-hidden="true" />
            <div><small>After</small><strong>{landingConsequence.delta.simulatedTransferTerm}</strong></div>
          </div>
          <div className="preview-moves">
            <strong className="preview-moves-title">{consequenceMoves.length} milestones move</strong>
            <div className="preview-move-list">
              {consequenceMoves.map((move, index) => (
                <div className="preview-move" key={move.code}>
                  <span className="preview-move-index">{index + 1}</span>
                  <div className="preview-move-course"><strong>{move.code}</strong><small>{move.title}</small></div>
                  <div className="preview-move-terms"><span>{move.fromTerm}</span><ArrowRight aria-hidden="true" /><strong>{move.toTerm}</strong></div>
                </div>
              ))}
            </div>
          </div>
          <div className="preview-consequence"><ShieldCheck aria-hidden="true" /><strong>Saved baseline stays protected until human confirmation.</strong></div>
        </div>
      </section>
    </main>
  );
}
