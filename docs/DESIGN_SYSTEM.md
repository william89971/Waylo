# Waylo Design System Inventory

Source of truth: the five approved desktop/mobile concepts generated for this Build Week task.

## Visual character and tokens

Calm academic navigation with a true-white canvas, near-white chrome, deep navy text, restrained blue actions, thin borders, limited shadows, and generous whitespace. The roadmap is the centerpiece; this is not a chatbot or KPI dashboard.

- Canvas `#FFFFFF`; chrome `#F8FAFC`; navy `#0B2545`; muted `#52647A`; border `#D7DEE8`
- Primary `#155EEF`; Cognitive Science `#6941C6`; Data Science `#0E9384`
- Confirmed `#15803D`; warning `#D97706`; blocker `#D92D20`
- Radii: 8px controls, 12px panels, 16px major surfaces; restrained elevation
- System typography: `Aptos`, `Inter`, `Segoe UI`, sans-serif; 14-16px body, 12-13px metadata, 28-36px desktop titles, 26-32px mobile titles

## Components and interactions

App shell, responsive navigation, route tabs, status pairs, semester rail, course row/block, evidence drawer, warning callout, comparison summary, extraction table, planning timeline, source panel, advisor summary, buttons, selects, toggles, slider, dialog, sheet, and print section.

Core interactions: review uncertain transcript course; select pathway/route; expand course/evidence; remove Calculus I and recalculate; switch pathway; undo/reset/apply; replay/run planning session; open validated route; print summary; reset data.

## Responsive behavior

Desktop uses a fixed sidebar, wide canvas, horizontal terms, and contextual right rail. Mobile uses compact header, vertical term rail, expandable details, and sticky bottom actions. Editable tables stack without page overflow.

## Fidelity gates

Compare final screenshots for navigation/copy, canvas color, title hierarchy, roadmap anatomy, semantic colors, panel density, course typography, right-rail balance, mobile rail, and sticky actions. Record intentional deviations in `docs/FINAL_VERIFICATION.md`.
