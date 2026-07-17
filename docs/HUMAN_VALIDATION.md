# Human Validation Protocol

Status: protocol ready; results pending. Do not convert expected outcomes into participant feedback.

## Participants

Run the protocol with three people who did not build Waylo. Ideally include at least one current or recent community-college student and one person familiar with academic advising. Record only what each participant actually says or does.

## Recruitment message

“I built a planning prototype for community-college transfer students and need a 12-minute usability check. You will use a fictional seeded student—no account, transcript, or personal information is needed. I am testing whether the product is understandable and trustworthy, not testing you. Honest confusion and criticism are useful.”

## Consent opening

Before starting, say: “I will record brief written notes but no audio, video, credentials, or personal academic data. You may stop at any time. Is that okay?”

## Session setup

- Use the deployed seeded Judge Tour in a logged-out browser.
- Do not explain the product before the first question.
- Let the participant think aloud.
- Do not rescue the participant unless they are blocked for more than 30 seconds; record the block first.
- Do not expose credentials, real transcript data, or personal information.

## Tasks and questions

### 1. Landing comprehension

Show the landing page for 10 seconds.

- “What do you think Waylo does?”
- “Who is it for?”
- “What would you click first?”

Record whether the participant describes decision simulation, academic consequences, and counselor review without prompting.

### 2. Calculus I consequence

Ask the participant to start the tour and run the Calculus I change.

- “What changed?”
- “Why did it change?”
- “Was the saved plan replaced?”

Record whether they can identify the Fall 2028 → Spring 2029 change, four affected milestones, the prerequisite sequence, and the protected baseline.

### 3. Evidence versus counselor confirmation

Ask the participant to open Evidence and trust.

- “What does Waylo know from evidence?”
- “What still needs a counselor?”
- “If a counselor confirms the match, does the source become verified?”

Record confusion between deterministic route validity, evidence status, and counselor-confirmed status.

### 4. Trust and verification

- “What makes you trust this result?”
- “What makes you distrust or question it?”
- “What would you verify before acting?”
- “What information is missing?”

Record direct quotes sparingly and exactly. Do not paraphrase a negative observation into praise.

## Session record

| Participant | Context | Completed landing task | Explained consequence | Distinguished evidence/counselor | Trust signals | Distrust/questions | Verification they wanted | Direct observations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| P2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |
| P3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Completion rule

Mark the protocol complete only after all three sessions occur and the table contains direct observations. Product changes prompted by a session should reference the participant ID and the observed failure, not a fabricated score.

Treat any of these as a release-blocking comprehension failure:

- Two or more participants cannot identify the Fall 2028 to Spring 2029 consequence after the tour.
- Any participant believes the saved baseline was silently replaced.
- Two or more participants treat partial evidence as verified.
- Any participant interprets Waylo as an official degree audit, admissions guarantee, or counselor replacement after reading the disclosures.

If a release-blocking failure appears, make the smallest evidence-backed correction, rerun the affected test and complete suite, and retest the exact failed task with a new participant. Do not erase or rewrite the original observation.
