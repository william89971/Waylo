# Academic Data Coverage and Evidence Register

Retrieved: 2026-07-13

## Coverage boundary

Waylo V1 starts at College of the Canyons and supports exactly six university-program pathways. The route engine does not extrapolate to another origin, university, or program.

| Pathway | Program-name source | Requirement source status | COC articulation status |
| --- | --- | --- | --- |
| UC Berkeley Cognitive Science B.A. | Berkeley department | Verified current program page | Specific mappings require ASSIST review |
| UC Berkeley Data Science B.A. | Berkeley CDSS | Verified Fall 2026 transfer guidance | Specific mappings require ASSIST review |
| UCLA Cognitive Science B.S. | UCLA majors directory | Verified current UCLA transfer-preparation page | Specific mappings require ASSIST review |
| UCLA Statistics and Data Science B.S. | UCLA majors directory | Verified current department worksheet index | Specific mappings require ASSIST review |
| UC San Diego Cognitive Science B.S. | UCSD department | Verified current transfer guidance | Specific mappings require ASSIST review |
| UC San Diego Data Science B.S. | UCSD Data Science | Verified 2026 transfer guidance | Specific mappings require ASSIST review |

## Evidence policy

Every evidence record in `src/lib/academic-data.ts` stores a source URL, effective year, retrieval date, provenance, status, and a scoped note. Status values are `verified`, `partial`, `uncertain`, and `unavailable`.

Official university pages support destination program names and preparation categories. Official College of the Canyons sources support the local course catalog, units, and known prerequisite facts represented in the demo. The ASSIST homepage record is deliberately `partial`: it signals that exact institution-to-institution equivalencies still need a current agreement check. Those course cards are marked for attention, the route carries an ASSIST assumption, and the advisor summary lists the unresolved check.

The route validator establishes that a candidate is internally valid against the curated Waylo dataset. It does not convert a partial articulation record into a verified equivalency or claim that the route is an official degree audit.

## Source register

| ID | Source | Effective year | Status | Supports |
| --- | --- | --- | --- | --- |
| `coc-math-2025` | College of the Canyons 2025–26 Catalog | 2025–26 | Verified | COC course titles, units, and represented calculus sequence |
| `coc-cs-current` | COC Computer Science Department | Current page retrieved 2026 | Verified | Represented computer-science course identities |
| `coc-stats-current` | COC Math and Statistics Courses | 2025–26 | Verified | STAT C1000 identity and units |
| `assist-review` | ASSIST | 2025–26 | Partial | Exact articulation must be checked in the applicable agreement |
| `berkeley-cogsci` | Berkeley Cognitive Science requirements | Current page retrieved 2026 | Verified | Preparation categories represented in the pathway |
| `berkeley-data` | Berkeley Data Science transfer guidance | Fall 2026 | Verified | Transfer preparation categories represented in the pathway |
| `ucla-majors` | UCLA majors directory | 2026 | Verified | Official UCLA program names |
| `ucla-cogsci` | UCLA Cognitive Science transfer preparation | Current guidance retrieved 2026 | Verified | One year of calculus, introductory programming, and additional preparation categories |
| `ucla-data` | UCLA Statistics & Data Science worksheets | Current page retrieved 2026 | Verified | Preparation categories represented in the pathway |
| `ucsd-cogsci` | UCSD Cognitive Science transfer guidance | Current page retrieved 2026 | Verified | Preparation categories represented in the pathway |
| `ucsd-data` | UCSD Data Science transfer guidance | 2026 | Verified | Preparation categories represented in the pathway |

## Known V1 limitations

- The dataset is a bounded demonstration, not a complete ASSIST agreement export, university catalog, general-education audit, or live registration schedule.
- Known term offerings are planning assumptions and are never presented as registration guarantees.
- Exact College of the Canyons equivalencies for UCLA's calculus and programming preparation remain explicit ASSIST-review items.
- UC San Diego Cognitive Science uses the general B.S. route; specializations are outside V1.
- Unknown or unsupported requirements remain counselor-review items rather than being guessed.
