# geno-camp

Campsite discovery and booking assistant for Claude Code.

## Structure

```
skills/geno-camp/SKILL.md              — main skill: search, compare, book campsites
skills/geno-camp/regions/washington.md  — WA region profile: parks, showers, booking details
skills/geno-camp/regions/oregon.md     — OR region profile: coast, Bend, Crater Lake, booking details
skills/geno-camp-watch/SKILL.md        — watch skill: add, list, check, scan, remove watches
watcher/
  index.js                             — main orchestrator: runWatches(), runScan(), CLI entry
  config.js                            — YAML CRUD for ~/.geno/camp-watches/*.yaml
  scanner.js                           — weekend scanner logic (Fri-Sun openings)
  notify-bridge.js                     — builds notification messages from watcher results
  platforms/
    index.js                           — platform adapter registry
    recreation-gov.js                  — recreation.gov availability checker (MVP)
    wa-state-parks.js                  — WA GoingToCamp checker (Phase 2 stub)
    or-state-parks.js                  — OR ReserveAmerica checker (Phase 2 stub)
```

## Data Paths

- `~/.geno/trips/` — booked trip YAML files
- `~/.geno/camp-saved/` — bookmarked campsites (not yet booked)
- `~/.geno/camp-watches/` — availability watch entries for sold-out sites

## Key Design Decisions

- **Region profiles**: pre-researched state knowledge files loaded before searching — avoids dead-end queries
- **Amenity-aware routing**: showers/hookups → state parks + private first; NPS deprioritized (no showers)
- **State-specific booking systems**: WA GoingToCamp, CA ReserveCalifornia, federal recreation.gov
- **Multi-platform search**: Hipcamp, The Dyrt, KOA, Campnab, camply
- **Verified amenities**: fetch actual campground pages to confirm, don't trust listing titles
- **Compare subcommand**: side-by-side table with winner highlighting
- All dates in YYYY-MM-DD format

## Conventions

- Follows geno ecosystem skill conventions (SKILL.md with frontmatter, package.json skill map)
- Uses WebSearch + WebFetch for discovery, AskUserQuestion for user interaction
- Optional geno-vla integration for browser-based booking automation
- Region profiles are additive — new states can be added without changing the skill
