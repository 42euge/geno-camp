/**
 * General weekend scanner — finds open weekends across campgrounds.
 */

import { KNOWN_CAMPGROUNDS, checkAvailability } from './platforms/recreation-gov.js';

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get upcoming Friday dates for the next N weeks.
 * @param {number} weeksAhead
 * @returns {Array<{friday: string, sunday: string}>} Each entry has checkin (Fri) and checkout (Sun).
 */
function getUpcomingWeekends(weeksAhead = 6) {
  const weekends = [];
  const now = new Date();

  // Find the next Friday
  const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);

  for (let i = 0; i < weeksAhead; i++) {
    const friday = new Date(nextFriday);
    friday.setDate(nextFriday.getDate() + i * 7);

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    weekends.push({
      friday: friday.toISOString().split('T')[0],
      sunday: sunday.toISOString().split('T')[0],
    });
  }

  return weekends;
}

/**
 * Scan recreation.gov campgrounds for weekend openings.
 *
 * @param {string[]|null} campgroundIds - Array of campground slugs to check, or null for all known.
 * @param {number} weeksAhead - How many weekends to scan (default 6).
 * @returns {Promise<Array<{campground: string, campgroundId: string, weekend: string, checkin: string, checkout: string, count: number, sites: object[]}>>}
 */
export async function scanForOpenings(campgroundIds = null, weeksAhead = 6) {
  const weekends = getUpcomingWeekends(weeksAhead);

  // Resolve which campgrounds to check
  const targets = campgroundIds
    ? campgroundIds
        .map(id => {
          const known = KNOWN_CAMPGROUNDS[id];
          return known ? { slug: id, ...known } : null;
        })
        .filter(Boolean)
    : Object.entries(KNOWN_CAMPGROUNDS).map(([slug, data]) => ({ slug, ...data }));

  if (targets.length === 0) {
    console.warn('[scanner] No valid campground IDs provided.');
    return [];
  }

  const openings = [];

  for (const campground of targets) {
    console.log(`[scanner] Checking ${campground.name} (${campground.id})...`);

    for (const weekend of weekends) {
      try {
        const result = await checkAvailability(campground.id, weekend.friday, weekend.sunday);

        if (result.available) {
          openings.push({
            campground: campground.name,
            campgroundId: campground.id,
            slug: campground.slug,
            weekend: `${weekend.friday} to ${weekend.sunday}`,
            checkin: weekend.friday,
            checkout: weekend.sunday,
            count: result.count,
            sites: result.sites,
          });
        }

        // Rate limit between weekend checks
        await sleep(1000);
      } catch (err) {
        console.warn(`[scanner] Error checking ${campground.name} for ${weekend.friday}: ${err.message}`);
      }
    }

    // Extra pause between campgrounds
    await sleep(1000);
  }

  // Sort by date, then by available count (descending)
  openings.sort((a, b) => {
    const dateCompare = a.checkin.localeCompare(b.checkin);
    if (dateCompare !== 0) return dateCompare;
    return b.count - a.count;
  });

  return openings;
}
