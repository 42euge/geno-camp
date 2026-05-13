---
name: geno-camp-watch
description: >-
  Monitor campgrounds for available campsites and alert when spots open up (cancellations).
  Add watches for specific dates, scan for open weekends, and manage watch list.
  Use when user says /geno-camp-watch.
argument-hint: "[add|list|check|scan|remove] [campground] [dates]"
license: MIT
metadata:
  author: 42euge
  version: "0.5.0"
---

# Campsite Availability Watcher

Monitor campgrounds for cancellations and open spots. Supports recreation.gov campgrounds (MVP), with WA and OR state park adapters planned for Phase 2.

## Input

`{{ args }}` is a subcommand with optional arguments.

## Tools Required

- **Bash** — run the watcher Node.js code at `watcher/` in the geno-camp repo
- **Read** — read watch config files from `~/.geno/camp-watches/`
- **PushNotification** (optional) — send alerts when availability is found

## Subcommands

### add <campground> <checkin> <checkout>

Create a new watch for a specific campground and date range.

1. Resolve the campground — match against known recreation.gov campgrounds:
   - `ohanapecosh` (232465) — Ohanapecosh, Mt. Rainier NP
   - `kalaloch` (232464) — Kalaloch, Olympic NP
   - `colonial-creek` (255201) — Colonial Creek South, North Cascades NP
   - `sol-duc` (251906) — Sol Duc Hot Springs, Olympic NP
   - `mazama` (232466) — Mazama, Crater Lake NP

2. Parse dates (YYYY-MM-DD format). Convert relative dates ("next weekend", "Aug 1-4").

3. Create the watch config by running:
   ```bash
   cd <geno-camp-repo> && node -e "
   import { createWatch } from './watcher/config.js';
   const slug = createWatch({
     campground: {
       name: '<name>',
       id: '<slug>',
       platform: 'Recreation.gov',
       platform_id: '<campground_id>',
       url: 'https://www.recreation.gov/camping/campgrounds/<campground_id>'
     },
     dates: { checkin: '<checkin>', checkout: '<checkout>' }
   });
   console.log('Created watch:', slug);
   "
   ```

4. Confirm to the user and suggest setting up a `/schedule` routine to check periodically.

### list

Show all watches and their status.

```bash
cd <geno-camp-repo> && node -e "
import { listWatches } from './watcher/config.js';
const watches = listWatches();
console.log(JSON.stringify(watches, null, 2));
"
```

Display as a table:
| Campground | Dates | Status | Last Checked | Last Result |

### check

Run all active watches now and report results.

```bash
cd <geno-camp-repo> && node watcher/index.js watches
```

Process the output:
- If any availability is found, present the notification details to the user
- If PushNotification tool is available, send an alert for each hit
- Report all results even if no availability found

### scan [weeks]

Scan all known recreation.gov campgrounds for weekend (Fri-Sun) openings.

```bash
cd <geno-camp-repo> && node watcher/index.js scan [weeks]
```

Default: 6 weeks ahead. Present results as a table sorted by date.

### remove <id>

Remove a watch by its slug.

```bash
cd <geno-camp-repo> && node -e "
import { removeWatch } from './watcher/config.js';
const removed = removeWatch('<slug>');
console.log(removed ? 'Removed' : 'Not found');
"
```

## Scheduling

After adding a watch, suggest the user set up automated checking:

> To check automatically, set up a schedule:
> `/schedule` — run `geno-camp-watch check` every 4 hours

The watcher is designed to be safe for automated runs:
- Rate-limited API calls (1s between requests)
- Proper User-Agent header
- Graceful error handling
- Results persisted to watch YAML files

## Data

- Watch configs: `~/.geno/camp-watches/*.yaml`
- Platform adapters: `watcher/platforms/` in the geno-camp repo
- Known campground IDs: `watcher/platforms/recreation-gov.js` KNOWN_CAMPGROUNDS

## Phase 2 (planned)

- WA State Parks (GoingToCamp) adapter
- OR State Parks (ReserveAmerica) adapter
- Hipcamp adapter
- Site-type filtering (tent-only, RV, etc.)
- Flexible date matching ("any weekend in August")
