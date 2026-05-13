---
name: geno-camp
description: >-
  Find campsites and book them. Search by location, dates, group size, and amenities.
  Compare options across recreation.gov, state park systems, Hipcamp, The Dyrt, and more.
  Use when user says /geno-camp.
argument-hint: "[location, dates, or preferences — e.g. 'WA this summer with showers for 4 people']"
license: MIT
metadata:
  author: 42euge
  version: "0.4.0"
---

# Campsite Discovery & Booking

Find, compare, and book campsites. Handles the full flow from search to reservation.

## Input

`{{ args }}` is freeform text describing what the user wants — location, dates, group size, amenities, or a subcommand (`trips`, `saved`, `watch`, `compare`).

## Tools Required

- **WebSearch** — find campsite availability across multiple platforms
- **WebFetch** — pull detailed campsite info, pricing, availability from specific URLs
- **AskUserQuestion** — confirm preferences, present options, get booking decisions
- **Read** — load region profiles from `regions/` directory for state-specific knowledge

## Region Profiles

Region profiles live in `regions/{state}.md` alongside this skill. They contain:
- State-specific booking systems and advance windows
- Regions within the state with vibes, best-for tags, and top picks
- Verified shower details (type, cost, hours, seasonal availability)
- Seasonal notes (fire restrictions, mosquitoes, passes required)

**When searching a specific state, always load its region profile first** (if one exists). This avoids dead-end searches and provides verified, pre-researched recommendations that can be presented immediately while web searches run for availability.

Currently available: `regions/washington.md`, `regions/oregon.md`

## Workflow

### 1. Parse the request

Extract what you can from the input:

| Field | Examples | Default if missing |
|---|---|---|
| **Location** | "WA", "Olympic Peninsula", "near Leavenworth" | Ask user |
| **Dates** | "next weekend", "July 4-7", "3 nights starting Friday", "this summer" | Ask user |
| **Group size** | "4 people", "solo", "family of 5" | 2 people |
| **Site type** | "tent", "RV", "cabin", "yurt", "glamping" | tent |
| **Amenities** | "showers", "dog-friendly", "lakefront", "fire pit", "hookups" | none required |
| **Budget** | "$30/night max", "cheap", "splurge" | no limit |
| **Vibe** | "remote", "family-friendly", "beach", "mountain", "old growth" | any |

If location or dates are missing, ask with `AskUserQuestion` — one question, both fields if needed.

Convert relative dates to absolute using today's date from the system context. For vague ranges like "this summer," use June 15 – September 15.

### 2. Route by amenity requirements

**This step is critical.** Different amenities exist on different platform types. Route the search to avoid dead ends:

| Amenity requested | Best sources | Avoid |
|---|---|---|
| **Showers** | State parks, Hipcamp/private, KOA, USFS (some) | National park campgrounds (most NPS sites have NO showers) |
| **Hookups (electric/water/sewer)** | State parks, KOA, private RV parks | National parks, USFS |
| **Flush toilets only** | All platforms | — |
| **Primitive/dispersed** | USFS, BLM, recreation.gov | State parks, KOA |
| **Cabins/yurts** | State parks, Hipcamp, recreation.gov | — |

When showers are requested, **deprioritize national park campgrounds** — search state parks and private sites first. If the user specifically wants a national park, note the lack of showers and suggest:
- Nearby state parks or private campgrounds with showers
- Day-use shower facilities (truck stops, rec centers, hot springs)
- Campgrounds adjacent to hot springs (e.g., Sol Duc in Olympic NP)

### 3. Search for campsites

Run multiple `WebSearch` queries in parallel. Tailor queries to the amenity routing from step 2.

**Core queries (always run):**
1. `"{location} campground {amenity} {dates or month/year}"` — general
2. `"hipcamp {location} {amenity}"` — private/glamping sites with amenity filters
3. `"thedyrt.com {location} camping {amenity}"` — The Dyrt reviews and ratings

**Conditional queries based on routing:**
4. `"{state} state parks camping {amenity} reservations"` — state parks (when amenities like showers/hookups needed)
5. `"recreation.gov {location} camping {month} {year}"` — federal lands (when primitive/USFS/NPS is appropriate)
6. `"KOA {location} camping"` — KOA franchises (when hookups/showers/family amenities needed)

**Platform-specific booking systems by state:**

| State | Booking system | URL |
|---|---|---|
| Washington | GoingToCamp | washington.goingtocamp.com |
| California | ReserveCalifornia | reservecalifornia.com |
| Oregon | Oregon State Parks | oregonstateparks.reserveamerica.com |
| Federal (NPS/USFS/BLM) | Recreation.gov | recreation.gov |

Always include a search for the state-specific booking system.

### 4. Fetch details

For the top 5-8 promising results, use `WebFetch` to get:
- Exact availability for the requested dates
- Per-night pricing (note: Hipcamp often requires fetching individual listing pages)
- Site-specific amenities with detail level:
  - Showers: free vs coin-op, hot water, seasonal availability, hours
  - Toilets: flush vs vault/pit
  - Hookups: electric amps (20/30/50), water, sewer
- Cancellation policy
- Campground alerts (closures, construction, fire restrictions)
- Recent reviews mentioning the requested amenities

**Verify amenities exist** — don't trust listing titles alone. Fetch the actual campground page and confirm the amenity is mentioned in the facility description.

### 5. Present options

Show options as a ranked table directly in text (more scannable than AskUserQuestion for comparison). Then use `AskUserQuestion` to let the user pick.

For each option:

```
### 1. [Campground Name] — [Platform]
📍 Location | ⭐ Rating (reviews) | 💰 $XX/night
🚿 Showers: [free hot / coin-op / seasonal] | 🏕️ [tent/RV/cabin]
📅 Available: [specific dates or "wide open" / "weekdays only" / "sold out weekends"]
🔗 [booking URL]
Why: [1 sentence on why this matches their request]
```

Include 4-6 options, ordered by best match to the user's stated preferences. After the list, use `AskUserQuestion` with options for each campground plus "Show more" and "Refine search."

### 6. Booking

Once the user picks a site, provide the platform-specific booking guide:

#### 6a. Washington State Parks (GoingToCamp)

**URL:** `https://washington.goingtocamp.com/create-booking/results?resourceLocationId={park_id}`

**What you need ready:**
- Credit card
- Arrival/departure dates + backup choices
- RV/trailer length if applicable
- Number of campers and tents
- Primary camper name, address, phone, email

**Steps:**
1. Go to washington.goingtocamp.com → "Create Booking"
2. Search by park name or map → select park
3. Enter dates and equipment type → view available sites
4. Select a specific site (use map view to pick by location)
5. Review site details (hookups, size, shade, proximity to showers)
6. Add to cart → fill in camper details
7. Pay with credit card ($8 online reservation fee added)

**Gotchas:**
- Session times out — don't take too long browsing
- Same-day bookings available until 2pm (tent/RV only, not cabins)
- Split reservations (2 sites) require calling (888) 226-7688
- Minimum 2-night stay for roofed accommodations May 15 – Sep 15

**Cancellation:** Refund minus service fee if cancelled 48+ hours before arrival.

#### 6b. Oregon State Parks (ReserveAmerica)

**URL:** `https://oregonstateparks.reserveamerica.com`

**Steps:**
1. Go to oregonstateparks.reserveamerica.com
2. Search by park name or browse by region
3. Select park → view available dates
4. Pick a specific site (map view recommended)
5. Fill in group size and equipment details
6. Create account or sign in → pay with credit card ($8 reservation fee)

**Gotchas:**
- 9-month advance booking window
- Coastal parks (Cape Lookout, Fort Stevens) sell out fast for July/August weekends
- No day-use pass required at most Oregon state parks
- Cabins and yurts have minimum 2-night stays in summer

**Cancellation:** Refund minus $8 fee if cancelled 2+ days before arrival.

#### 6c. Recreation.gov (Federal)

**Steps:**
1. Go to recreation.gov → search campground name
2. Select campground → "Check Availability"
3. Calendar view shows available dates in green
4. Select site → "Book Now"
5. Sign in or create account → fill in details → pay

**Gotchas:**
- $6 non-refundable reservation fee
- 15-minute checkout timer — have payment ready
- Some sites show "Not Yet Released" — check the 15th of month at 10am ET

#### 6c. Hipcamp (Private)

**Steps:**
1. Go to listing page → select dates → "Reserve"
2. Rulebook: read property rules and policies → "Agree and Continue"
3. Extras: add firewood bundles, kayak rental, etc. (optional) → "Continue"
4. Vehicles: enter number of vehicles and camping setup (tent size, etc.)
5. Payment: credit card + review total (service fee included)
6. Some hosts use "Request to Book" (not instant) — wait for approval within 24h

**Gotchas:**
- Service fee is 10-15% on top of listed price
- "Request to Book" sites may not confirm — have a backup
- Cancellation policy varies by host (check before booking)

#### 6d. Browser automation (geno-vla)

If the `geno-vla` MCP server is available:
1. Offer to open the booking URL in browser
2. Navigate to the availability page and fill in dates + group size
3. Let the user review the site selection
4. **Pause at the payment step** — never auto-submit payment
5. After user confirms booking, offer to save trip details

### 7. Save trip details

After booking (or when the user says "save this"), write trip details to `~/.geno/trips/`:

```yaml
# ~/.geno/trips/{slug}-{checkin-date}.yaml
name: "Deception Pass State Park"
location: "Anacortes, WA"
region: "Puget Sound / San Juan Islands"
dates:
  checkin: "2026-07-18"
  checkout: "2026-07-21"
  nights: 3
group_size: 4
site_type: tent
site_number: "Cranberry Loop C-42"
cost:
  per_night: 35
  reservation_fee: 8
  total: 113
booking:
  platform: washington.goingtocamp.com
  confirmation: null
  url: "https://washington.goingtocamp.com/..."
  cancellation_deadline: "2026-07-16"
  cancellation_policy: "Full refund minus $8 fee if cancelled 2+ days before"
amenities:
  confirmed:
    - hot showers (free)
    - flush toilets
    - fire pit
    - picnic table
    - potable water
  nearby:
    - beach (0.2 mi)
    - boat launch (0.5 mi)
directions: "I-5 N to exit 230, follow signs to Deception Pass State Park"
notes: "Cranberry Loop has the best shade. Sites C-30 to C-50 are closest to showers."
created: 2026-05-02
```

---

## Subcommand: trips

List saved trips from `~/.geno/trips/`.

- Show upcoming trips first, then past trips
- For upcoming trips, show days until check-in
- Flag any cancellation deadlines coming up within 7 days
- Show a packing/prep checklist for trips within 14 days

## Subcommand: saved

List bookmarked/saved campsites from `~/.geno/camp-saved/` that the user liked but hasn't booked.

Format: `name | location | price | platform | last-checked date`

## Subcommand: watch

Set up availability monitoring for a sold-out campground. Writes a watch entry to `~/.geno/camp-watches/`:

```yaml
# ~/.geno/camp-watches/{slug}.yaml
campground: "Deception Pass - Cranberry Loop"
url: "https://washington.goingtocamp.com/..."
dates:
  checkin: "2026-08-01"
  checkout: "2026-08-04"
status: watching
created: 2026-05-02
last_checked: null
```

Suggest the user set up a `/schedule` routine to check availability periodically, or use Campnab (campnab.com) for automated alerts.

## Subcommand: compare

Side-by-side comparison of 2-4 campgrounds. Input: campground names or saved bookmark IDs.

1. Load details for each (from saved data or web search).
2. Present as a comparison table:

```
| | Deception Pass | Pearrygin Lake | Shangri La Push |
|---|---|---|---|
| Region | San Juans | North Cascades | Olympic Peninsula |
| Price/night | $35 | $38 | $45 |
| Showers | Coin-op ($1/12min) | Free (temp varies) | Free hot |
| Sites | 326 | 147 | 15 |
| Rating | 4.5★ (109) | 4.5★ (29) | 98% (2124) |
| Book via | GoingToCamp | GoingToCamp | Hipcamp |
| Vibe | Scenic bridge, busy | Mountain lake, quiet | Rainforest, intimate |
| Drive from Seattle | 1.5 hr | 4 hr | 4.5 hr |
```

3. Highlight the winner in each category. Give a 1-sentence recommendation based on user preferences.

---

## Data Sources & APIs

For programmatic access (future automation):

- **Recreation.gov RIDB API** — ridb.recreation.gov — federal campground data, real-time availability
- **Camply** (open source) — github.com/juftin/camply — Python lib for checking recreation.gov + state parks availability
- **Campflare** — campflare.com/api — campground search API
- **Schema.org CampingPitch** — standard schema for campsite attributes (amenity features, occupancy, pricing)

When the user wants automated availability checking:

- **camply** (`pip install camply`) — scans recreation.gov and GoingToCamp for open sites, sends email/Slack/Pushover notifications when sites open up. Best for federal + WA state parks.
- **gocamp** (github.com/peckjon/gocamp) — Python wrapper specifically for WA GoingToCamp API. Can run complex queries like "all available weekends in July at Deception Pass." Read-only (no booking), but can deep-link to the booking page with prefilled search.
- **Campnab** (campnab.com) — SaaS cancellation scanner. No setup needed, just enter campground + dates. $10-20 per scan window.

For a `/schedule` routine, suggest a camply command that checks availability and sends a push notification when a site opens.

---

## Platform Reference

### Recreation.gov (Federal — NPS, USFS, BLM, Army Corps)
- 6-month rolling window, opens on the 15th of each month at 10am ET
- FCFS sites exist — note clearly, they require early arrival (before noon)
- Lottery sites (Half Dome, Enchantments, etc.) have separate windows
- **Most NPS campgrounds do NOT have showers** — only flush toilets and potable water
- Some USFS campgrounds have showers (larger developed sites)
- $6 non-refundable reservation fee

### State Park Systems
Each state runs its own reservation system with different advance windows:

| State | System | Advance window | Notes |
|---|---|---|---|
| **Washington** | GoingToCamp (washington.goingtocamp.com) | 9 months | Same-day booking available until 2pm; call (888) CAMPOUT |
| **California** | ReserveCalifornia | 6 months | Popular sites (Big Sur, Anza-Borrego) sell out instantly |
| **Oregon** | ReserveAmerica | 9 months | Coastal parks extremely popular in summer |

State parks are the **best bet for showers** — most developed state park campgrounds include shower buildings.

### Hipcamp
- Private land — more availability but higher prices ($15-150/night, avg ~$56)
- Unique sites: treehouses, yurts, oceanfront, farm stays
- Amenity detail varies by host — always verify shower type
- Flexible cancellation on most sites
- Good fallback when public campgrounds are sold out

### The Dyrt
- Review and discovery platform (not a booking site — links out to booking platforms)
- Best for comparing ratings and reading recent reviews about amenity condition
- Pro membership gives access to free camping/dispersed site database

### Campnab
- Cancellation monitoring service for sold-out campgrounds
- Covers recreation.gov and most state park systems
- Costs ~$10-20 for a scan period
- Suggest when user's preferred dates are sold out

### KOA (Kampgrounds of America)
- Franchise campgrounds — consistent amenities (always have showers, store, laundry)
- Three tiers: Journey (basic), Holiday (family amenities), Resort (pool, activities)
- Higher prices ($40-80/night) but reliable facilities
- Good option when amenities are non-negotiable

### General tips to share with user
- **Weekday stays** are dramatically easier to book in summer
- **Shoulder season** (Sep-Oct, Apr-May) has best availability and fewer crowds
- **FCFS sites** require early arrival — arrive before noon, earlier on weekends
- **Cancellation scanning** — check Campnab or refresh booking sites 2-3 weeks before (when others cancel)
- **Backup plan** — always have a second campground in mind; also know the nearest FCFS or dispersed camping option
- **Shower alternatives** when camping in NPS: nearby state parks, hot springs, truck stops (Pilot/Flying J), rec center day passes
