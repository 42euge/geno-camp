# geno-camp

Campsite discovery and booking assistant for Claude Code.

## Structure

```
skills/geno-camp/SKILL.md   — main skill: search, compare, book campsites
```

## Data Paths

- `~/.geno/trips/` — saved trip YAML files (booked reservations)
- `~/.geno/camp-saved/` — bookmarked campsites (not yet booked)

## Conventions

- Follows geno ecosystem skill conventions (SKILL.md with frontmatter, package.json skill map)
- Uses WebSearch + WebFetch for campsite discovery, AskUserQuestion for user interaction
- Optional geno-vla integration for browser-based booking automation
- All dates in YYYY-MM-DD format
