# geno-camp

Campsite discovery and booking assistant for Claude Code. Part of the [geno ecosystem](https://github.com/42euge/geno-tools).

## What it does

- **Search** across recreation.gov, Reserve California, Hipcamp, KOA, and state park systems
- **Compare** sites by price, amenities, availability, and ratings
- **Book** with direct links or browser automation via geno-vla
- **Save** trip details and bookmarked sites for future reference

## Install

```bash
# via geno-tools
/geno-tools install 42euge/geno-camp
```

## Usage

```
/geno-camp Yosemite next weekend for 4 people, dog-friendly
/geno-camp Big Sur July 4-7, tent sites with ocean view
/geno-camp trips
/geno-camp saved
```

## Data

Trip files are saved to `~/.geno/trips/` as YAML. Bookmarked sites go to `~/.geno/camp-saved/`.
