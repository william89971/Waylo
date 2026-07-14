# Waylo

> Find your way through college.

Waylo is an evidence-grounded academic navigation system for community-college students. It helps students compare transfer and major pathways, build semester-by-semester routes, test plan changes, identify blockers, and prepare a plan to review with a counselor.

This repository is the OpenAI Build Week implementation. The initial demonstration deeply supports six College of the Canyons pathways across UC Berkeley, UCLA, and UC San Diego for Cognitive Science and Data Science-related programs.

## Current status

Waylo is under active Build Week development. The product-complete target is **July 18, 2026 at 5:00 PM PT**. The submission deadline is **July 21, 2026 at 5:00 PM PT**.

See [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) for the implementation sequence and [`docs/HACKATHON_REQUIREMENTS.md`](docs/HACKATHON_REQUIREMENTS.md) for the submission-source register.

## Safety and academic-use note

Waylo is a planning aid, not an official degree audit or admissions decision. Academic requirements and articulation agreements change. Students should verify plans with official sources and a counselor before changing enrollment or transfer decisions.

## Environment

The application is designed to work in seeded mode without credentials. Live OpenAI features use a server-side `OPENAI_API_KEY` supplied by the user.

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Never commit `.env.local` or expose the key in browser code, logs, screenshots, or documentation.

## License

MIT
