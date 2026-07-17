# Waylo Judge Testing Instructions

## Fastest product path

1. Open the submitted public application URL in a logged-out browser.
2. Confirm the landing preview shows `Fall 2028` to `Spring 2029`, `4 milestones move`, and the protected saved baseline.
3. Select **Start the 2-minute judge tour**.
4. Select **Show me the consequence**.
5. Continue through **Intelligence and validation**, open **Judge Mode**, then inspect **Evidence and trust** and **Counselor handoff**.
6. Open the printable Advisor Decision Packet.

The seeded judge path requires no account, API key, access code, transcript, or personal data. Use `Reset tour` or append `?fresh=1` to `/judge-tour` to restore the seeded College of the Canyons workspace.

## What the judge should verify

- GPT-5.6 interprets unstructured intent into a strict `PlanCommandInterpretation`; it does not validate or persist an academic route.
- Deterministic code searches bounded candidates, retains an invalid candidate, attempts one allowlisted repair, and revalidates the final route.
- The Calculus I change moves four real dependency milestones and changes the estimate from Fall 2028 to Spring 2029.
- The saved baseline remains protected until a valid route passes the human confirmation gate.
- Evidence status, counselor-confirmed status, and deterministic route validity remain distinct.
- Judge Mode exposes sanitized operational facts without prompts, transcript contents, raw model responses, chain-of-thought, or secrets.

## Repository path

Until the Build Week pull request is merged, test the exact submitted branch:

```powershell
git clone --branch codex/waylo-build-week --single-branch https://github.com/william89971/Waylo.git
Set-Location Waylo
npm.cmd ci
npm.cmd run check
npm.cmd run test:e2e
```

Seeded mode is the default and requires no `.env.local` file. The repository is MIT licensed. If the repository remains private, it must be shared with the required Devpost and OpenAI reviewer accounts before submission.

## Access release gate

Do not submit a temporary Vercel share URL. Temporary share tokens expire before the judging period ends. The final submitted application URL must remain free of charge and accessible without Vercel team authentication through judging, or include durable testing credentials that satisfy the Official Rules.
