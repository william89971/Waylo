# Visual Fidelity Record

The implementation follows the two approved Waylo concepts: the command-bar roadmap and the Evidence-to-Plan onboarding workflow. It keeps the existing light academic dashboard instead of adopting a generic dark AI-product aesthetic.

## Design language

- Calm white and mist-gray surfaces, navy typography, Waylo blue actions, teal verified states, and amber review states.
- The roadmap remains the visual centerpiece on Overview, Roadmap, What-If, and route-strategy comparison.
- Dot-grid, route rail, active border, and branch-line effects appear only where they reinforce navigation, evidence flow, or current state.
- Motion is limited to structured-preview entry, route recalculation, course movement, progress steps, and responsive drawers/dialogs; reduced-motion settings are honored.
- No dark mode, glassmorphism, meteors, glow-heavy effects, 3D tilt, marquee, or generic bento treatment.

## Fidelity ledger

| Approved concept signal | Implemented comparison | Result |
| --- | --- | --- |
| Natural-language command directly above the roadmap | `WayloCommandBar` precedes the active route on `/roadmap` and `/overview` | Matched |
| Structured preview before simulation/save | Preview lists bounded changes and confidence before the deterministic engine runs | Matched |
| Before/after transfer target outcome | Fall 2028 → Spring 2029 appears from engine data with an acknowledgment gate | Matched |
| Roadmap as the dominant visual | Large route rail, milestone nodes, term cards, and a destination flag remain central | Matched |
| Evidence-to-Plan split layout | Temporary upload surface sits beside a visible seven-stage progress rail | Matched |
| Student review before commit | Extracted rows stay in component state until “Confirm courses and generate routes” | Matched |
| Actionable uncertainty | Evidence drawer, counselor draft, alternate-route check, and counselor-confirmed dialog replace passive warnings | Matched |
| Transparent operations without private reasoning | Source IDs, counts, validation, rejection, repair, and final route events are shown | Matched |
| Responsive mobile flow | Command, roadmap, extraction, compare branches, trace, and action cards stack without horizontal overflow at 390×844 | Matched |

## Browser evidence

Rendered checks cover 1440×900 desktop and 390×844 mobile. The suite also verifies keyboard focus restoration, reduced motion, no serious/critical axe findings, print output, and horizontal-overflow boundaries across every public and workspace route.
