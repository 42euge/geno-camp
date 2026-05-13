/**
 * Recreation.gov availability checker.
 *
 * Uses the public availability API — no auth required.
 * Rate-limited to 1 request per second.
 */

export const platform = 'Recreation.gov';

const BASE_URL = 'https://www.recreation.gov/api/camps/availability/campground';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

/** Known recreation.gov campground IDs from the geno-camp dataset. */
export const KNOWN_CAMPGROUNDS = {
  'ohanapecosh':      { id: '232465', name: 'Ohanapecosh Campground' },
  'kalaloch':         { id: '232464', name: 'Kalaloch Campground' },
  'colonial-creek':   { id: '255201', name: 'Colonial Creek South' },
  'sol-duc':          { id: '251906', name: 'Sol Duc Hot Springs Resort Campground' },
  'mazama':           { id: '232466', name: 'Mazama Campground (Crater Lake)' },
};

/**
 * Sleep for the given number of milliseconds.
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine which month-start dates we need to query for a given date range.
 * Recreation.gov availability is queried per calendar month.
 *
 * @param {string} checkin  - YYYY-MM-DD
 * @param {string} checkout - YYYY-MM-DD
 * @returns {string[]} Array of ISO date strings for the 1st of each month needed.
 */
function getMonthStarts(checkin, checkout) {
  const starts = [];
  const start = new Date(checkin + 'T00:00:00Z');
  const end = new Date(checkout + 'T00:00:00Z');

  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    starts.push(cursor.toISOString());
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return starts;
}

/**
 * Fetch availability for a single month from recreation.gov.
 *
 * @param {string} campgroundId - The campground ID (e.g. "232465")
 * @param {string} monthStart   - ISO date string for the 1st of the month
 * @returns {Promise<object>} The API response JSON, or null on error.
 */
async function fetchMonth(campgroundId, monthStart) {
  const url = `${BASE_URL}/${campgroundId}/month?start_date=${encodeURIComponent(monthStart)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    console.warn(`[recreation-gov] Rate limited on campground ${campgroundId}. Backing off.`);
    await sleep(5000);
    return null;
  }

  if (!res.ok) {
    console.warn(`[recreation-gov] HTTP ${res.status} for campground ${campgroundId} month ${monthStart}`);
    return null;
  }

  return res.json();
}

/**
 * Generate the list of night-dates the camper needs (checkin through checkout-1).
 *
 * @param {string} checkin  - YYYY-MM-DD
 * @param {string} checkout - YYYY-MM-DD
 * @returns {string[]} ISO date keys like "2026-06-01T00:00:00Z"
 */
function getNightDates(checkin, checkout) {
  const dates = [];
  const start = new Date(checkin + 'T00:00:00Z');
  const end = new Date(checkout + 'T00:00:00Z');

  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().replace('.000Z', 'Z');
    dates.push(iso);
  }
  return dates;
}

/**
 * Check availability for a campground over a specific date range.
 *
 * @param {string} campgroundId - Recreation.gov campground ID
 * @param {string} checkin      - YYYY-MM-DD
 * @param {string} checkout     - YYYY-MM-DD
 * @returns {Promise<{available: boolean, count: number, sites: Array<{siteId: string, site: string, type: string}>}>}
 */
export async function checkAvailability(campgroundId, checkin, checkout) {
  const monthStarts = getMonthStarts(checkin, checkout);
  const nightDates = getNightDates(checkin, checkout);

  // Fetch each needed month, with 1s delay between requests
  const allCampsites = {};
  for (let i = 0; i < monthStarts.length; i++) {
    if (i > 0) await sleep(1000);

    const data = await fetchMonth(campgroundId, monthStarts[i]);
    if (!data || !data.campsites) continue;

    // Merge campsites from this month into the running set
    for (const [siteId, siteData] of Object.entries(data.campsites)) {
      if (!allCampsites[siteId]) {
        allCampsites[siteId] = {
          campsite_id: siteData.campsite_id,
          site: siteData.site,
          campsite_type: siteData.campsite_type,
          availabilities: {},
        };
      }
      Object.assign(allCampsites[siteId].availabilities, siteData.availabilities);
    }
  }

  // Find sites where ALL nights in the range are available
  const availableStatuses = new Set(['Available', 'Open']);
  const availableSites = [];

  for (const [siteId, siteData] of Object.entries(allCampsites)) {
    const allNightsAvailable = nightDates.every(date => {
      const status = siteData.availabilities[date];
      return status && availableStatuses.has(status);
    });

    if (allNightsAvailable) {
      availableSites.push({
        siteId: siteData.campsite_id,
        site: siteData.site,
        type: siteData.campsite_type,
      });
    }
  }

  return {
    available: availableSites.length > 0,
    count: availableSites.length,
    sites: availableSites,
  };
}

/**
 * Check availability for a single date (used by the scanner).
 *
 * @param {string} campgroundId - Recreation.gov campground ID
 * @param {string} date         - YYYY-MM-DD (the night to check)
 * @returns {Promise<{available: boolean, count: number}>}
 */
export async function checkDate(campgroundId, date) {
  const monthStart = new Date(Date.UTC(
    parseInt(date.slice(0, 4)),
    parseInt(date.slice(5, 7)) - 1,
    1
  )).toISOString();

  const data = await fetchMonth(campgroundId, monthStart);
  if (!data || !data.campsites) return { available: false, count: 0 };

  const dateKey = date + 'T00:00:00Z';
  const availableStatuses = new Set(['Available', 'Open']);
  let count = 0;

  for (const siteData of Object.values(data.campsites)) {
    const status = siteData.availabilities?.[dateKey];
    if (status && availableStatuses.has(status)) {
      count++;
    }
  }

  return { available: count > 0, count };
}
