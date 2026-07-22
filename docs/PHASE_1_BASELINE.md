# Phase 1 conversion baseline

The complete `codex/waylo-build-week` application was fast-forwarded onto local
`main` at commit `682b0f2`. The source branch was not changed.

Before production conversion, the preserved application passed:

- TypeScript: pass
- ESLint: pass
- Vitest: 57/57 pass
- Next.js production build: pass
- Browser health endpoint: pass

The remaining legacy browser cases could not run in the first baseline attempt
because Playwright Chromium was not installed on the machine. Chromium was then
installed before the new production journey suite was added. The old Build Week
expectations remain available in Git history and are intentionally superseded by
the real-student journey tests as hackathon routes are retired.
