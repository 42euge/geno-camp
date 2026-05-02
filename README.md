# geno-camp

Campsite discovery and booking assistant for Claude Code. Part of the [geno ecosystem](https://github.com/42euge/geno-tools).

## What it does

- **Search** across recreation.gov, state park systems (GoingToCamp, ReserveCalifornia), Hipcamp, The Dyrt, KOA
- **Smart routing** — knows which platforms have showers, hookups, etc. (NPS campgrounds rarely have showers; state parks do)
- **Region profiles** — pre-researched state knowledge with verified amenity details, booking systems, and seasonal tips
- **Compare** campsites side-by-side with winner highlighting
- **Book** with platform-specific step-by-step guides or browser automation via geno-vla
- **Watch** sold-out sites for cancellations (via camply, gocamp, or Campnab)
- **Save** trip details and bookmarked sites for future reference

## Install

```bash
# via geno-tools
/geno-tools install 42euge/geno-camp
```

## Usage

```
/geno-camp WA this summer with showers for 4 people
/geno-camp Big Sur July 4-7, tent sites with ocean view
/geno-camp compare Deception Pass, Pearrygin Lake, Shangri La Push
/geno-camp watch Deception Pass Aug 1-4
/geno-camp trips
/geno-camp saved
```

## Region Profiles

Pre-researched state knowledge files that make searches faster and smarter:

| State | File | Highlights |
|---|---|---|
| Washington | `regions/washington.md` | 7 regions, 30+ campgrounds, verified shower details, GoingToCamp booking |

Want to add a state? Create `regions/{state}.md` following the WA template.

## Data

- `~/.geno/trips/` — booked trip YAML files
- `~/.geno/camp-saved/` — bookmarked campsites
- `~/.geno/camp-watches/` — availability watch entries

## Automation

For programmatic availability checking:
- **camply** — `pip install camply` — scans recreation.gov + GoingToCamp with notifications
- **gocamp** — Python wrapper for WA GoingToCamp API (read-only)
- **Campnab** — SaaS cancellation scanner ($10-20/scan)
