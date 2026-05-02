---
name: geno-camp
description: >-
  Find campsites and book them. Search by location, dates, group size, and amenities.
  Compare options and handle the booking flow. Use when user says /geno-camp.
argument-hint: "[location, dates, or preferences — e.g. 'Yosemite next weekend for 4 people']"
license: MIT
metadata:
  author: 42euge
  version: "0.1.0"
---

# Campsite Discovery & Booking

Find, compare, and book campsites. Handles the full flow from search to reservation.

## Input

`{{ args }}` is freeform text describing what the user wants — location, dates, group size, amenities, or a subcommand (`trips`, `saved`).

## Tools Required

- **WebSearch** — find campsite availability across recreation.gov, Reserve California, Hipcamp, KOA, state park systems, and other booking platforms
- **WebFetch** — pull detailed campsite info, pricing, and availability calendars from specific URLs
- **AskUserQuestion** — confirm preferences, present options, get booking decisions

## Workflow

### 1. Parse the request

Extract what you can from the input:

| Field | Examples | Default if missing |
|---|---|---|
| **Location** | "Yosemite", "Big Sur", "near Lake Tahoe" | Ask user |
| **Dates** | "next weekend", "July 4-7", "3 nights starting Friday" | Ask user |
| **Group size** | "4 people", "solo", "family of 5" | 2 people |
| **Site type** | "tent", "RV", "cabin", "yurt" | tent |
| **Amenities** | "showers", "dog-friendly", "lakefront", "fire pit" | none required |
| **Budget** | "$30/night max", "cheap", "splurge" | no limit |

If location or dates are missing, ask with `AskUserQuestion` — one question, both fields if needed.

Convert relative dates to absolute using today's date from the system context.

### 2. Search for campsites

Run multiple `WebSearch` queries in parallel to cover different sources:

1. `"{location} campsite availability {dates}"` — general availability
2. `"recreation.gov {location} camping {month} {year}"` — federal lands (national parks, forests, BLM)
3. `"{location} state park camping reservations"` — state parks
4. `"hipcamp {location}" OR "campspot {location}"` — private/glamping sites

Scan results for:
- Direct booking links
- Availability status
- Pricing
- Ratings and reviews
- Amenity lists

### 3. Fetch details

For the top 5-8 promising results, use `WebFetch` to get:
- Exact availability for the requested dates
- Per-night pricing
- Site-specific amenities
- Cancellation policy
- Photos/description (summarize, don't show raw HTML)

### 4. Present options

Use `AskUserQuestion` with the top 3-5 options. For each option show:

- **Name** and location
- **Price** per night and total
- **Available dates** that match the request
- **Key amenities** (matched to user preferences first)
- **Rating** if available
- **Booking platform** (recreation.gov, Hipcamp, direct, etc.)

Let the user pick one, or ask to see more options / refine search.

### 5. Booking

Once the user picks a site:

1. Provide the direct booking URL.
2. Summarize what they need to complete the reservation:
   - Account requirements (recreation.gov login, etc.)
   - Payment info needed
   - Any lottery/waitlist status
   - Cancellation policy and deadlines
3. If the user has `geno-vla` available, offer to automate the booking flow via browser automation — navigate to the booking page, fill in dates and group size, and walk the user through payment.
4. If no browser automation, provide step-by-step instructions with the exact URL and what to click/enter.

### 6. Save trip details

After booking (or when the user says "save this"), write trip details to `~/.geno/trips/`:

```yaml
# ~/.geno/trips/{slug}-{date}.yaml
name: "Upper Pines - Yosemite"
location: "Yosemite Valley, CA"
dates:
  checkin: "2026-07-04"
  checkout: "2026-07-07"
group_size: 4
site_type: tent
site_number: "A42"
cost:
  per_night: 36
  total: 108
  fees: 10
booking:
  platform: recreation.gov
  confirmation: null
  url: "https://www.recreation.gov/..."
  cancellation_deadline: "2026-07-02"
amenities:
  - fire pit
  - bear box
  - picnic table
  - flush toilets nearby
notes: "Near shuttle stop 15. Arrive before 2pm for best shade."
created: 2026-05-02
```

---

## Subcommand: trips

List saved trips from `~/.geno/trips/`.

- Show upcoming trips first, then past trips
- For upcoming trips, show days until check-in
- Flag any cancellation deadlines coming up within 7 days

## Subcommand: saved

List bookmarked/saved campsites from `~/.geno/camp-saved/` that the user liked but hasn't booked.

---

## Search Tips by Platform

### recreation.gov (Federal)
- 6-month rolling window, opens on the 15th of each month at 10am ET
- Some sites are first-come-first-served (FCFS) — note this clearly
- Lottery sites (e.g., Half Dome) have separate application windows

### Reserve California
- California state parks — reservations open 6 months ahead
- Popular sites (Big Sur, Anza-Borrego) book out immediately

### Hipcamp
- Private land — more availability but higher prices
- Often has unique sites (treehouses, yurts, oceanfront)
- No-hassle cancellation on most sites

### General tips to share with user
- Weekday stays are much easier to book
- Shoulder season (Sep-Oct, Apr-May) has best availability
- FCFS sites require early arrival (before noon)
- Always have a backup site in mind
