# geno-camp

Campsite discovery and booking assistant for Claude Code.

## Structure

```
skills/geno-camp/SKILL.md   — main skill: search, compare, book campsites
```

## Data Paths

- `~/.geno/trips/` — booked trip YAML files
- `~/.geno/camp-saved/` — bookmarked campsites (not yet booked)
- `~/.geno/camp-watches/` — availability watch entries for sold-out sites

## Key Design Decisions

- **Amenity-aware routing**: showers/hookups → state parks + private sites first; NPS campgrounds deprioritized since most lack showers
- **State-specific booking systems**: WA uses GoingToCamp, CA uses ReserveCalifornia, federal uses recreation.gov
- **Multi-platform search**: Hipcamp, The Dyrt, KOA, Campnab — not just recreation.gov
- **Verified amenities**: always fetch the actual campground page to confirm amenities exist, don't trust listing titles alone
- All dates in YYYY-MM-DD format

## Conventions

- Follows geno ecosystem skill conventions (SKILL.md with frontmatter, package.json skill map)
- Uses WebSearch + WebFetch for discovery, AskUserQuestion for user interaction
- Optional geno-vla integration for browser-based booking automation
