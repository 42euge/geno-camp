/**
 * Main watcher orchestrator.
 *
 * - runWatches() — check all active watches and return notifications for any hits.
 * - runScan()    — scan recreation.gov campgrounds for weekend openings.
 *
 * Can be run standalone: node watcher/index.js [watches|scan]
 */

import { listWatches, updateWatch } from './config.js';
import { getAdapter } from './platforms/index.js';
import { scanForOpenings } from './scanner.js';
import { buildWatchAlert, buildScanSummary } from './notify-bridge.js';

/**
 * Run all active watches: check availability, update state, return notifications.
 *
 * @returns {Promise<Array<{watch: object, slug: string, result: object, notification: object}>>}
 */
export async function runWatches() {
  const watches = listWatches();
  const active = watches.filter(w => w.data.status === 'watching');

  if (active.length === 0) {
    console.log('[watcher] No active watches.');
    return [];
  }

  console.log(`[watcher] Checking ${active.length} active watch${active.length === 1 ? '' : 'es'}...`);

  const notifications = [];

  for (const { slug, data } of active) {
    const platformName = data.campground?.platform;
    const platformId = data.campground?.platform_id;
    const checkin = data.dates?.checkin;
    const checkout = data.dates?.checkout;

    if (!platformName || !platformId || !checkin || !checkout) {
      console.warn(`[watcher] Skipping ${slug}: missing required fields.`);
      continue;
    }

    try {
      const adapter = getAdapter(platformName);
      console.log(`[watcher] Checking ${data.campground.name} (${checkin} to ${checkout})...`);

      const result = await adapter.checkAvailability(platformId, checkin, checkout);
      const now = new Date().toISOString();

      // Update the watch with results
      updateWatch(slug, {
        last_checked: now,
        last_result: {
          checked_at: now,
          available: result.available,
          count: result.count,
          sites: result.sites.slice(0, 10), // Keep at most 10 sites in the YAML
        },
      });

      if (result.available) {
        const notification = buildWatchAlert(data, result);
        notifications.push({ watch: data, slug, result, notification });
        console.log(`[watcher] FOUND: ${result.count} sites at ${data.campground.name}!`);
      } else {
        console.log(`[watcher] No availability at ${data.campground.name}.`);
      }
    } catch (err) {
      console.error(`[watcher] Error checking ${slug}: ${err.message}`);
    }
  }

  return notifications;
}

/**
 * Scan recreation.gov campgrounds for weekend openings.
 *
 * @param {object} options
 * @param {string[]|null} options.campgrounds - Campground slugs to scan (null = all known)
 * @param {number} options.weeksAhead - Number of weekends to check (default 6)
 * @returns {Promise<{openings: object[], summary: object}>}
 */
export async function runScan(options = {}) {
  const { campgrounds = null, weeksAhead = 6 } = options;

  console.log(`[watcher] Scanning for weekend openings (${weeksAhead} weeks ahead)...`);

  const openings = await scanForOpenings(campgrounds, weeksAhead);
  const summary = buildScanSummary(openings);

  console.log(`[watcher] ${summary.title}`);
  if (openings.length > 0) {
    console.log(summary.body);
  }

  return { openings, summary };
}

// --- CLI entry point ---

const args = process.argv.slice(2);
const command = args[0] || 'watches';

if (command === 'watches') {
  runWatches()
    .then(notifications => {
      if (notifications.length > 0) {
        console.log(`\n--- ${notifications.length} notification(s) ---`);
        for (const n of notifications) {
          console.log(`\n${n.notification.title}`);
          console.log(n.notification.body);
          if (n.notification.url) console.log(`Book: ${n.notification.url}`);
        }
      } else {
        console.log('\nNo availability found.');
      }
    })
    .catch(err => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
} else if (command === 'scan') {
  const weeksAhead = parseInt(args[1]) || 6;
  runScan({ weeksAhead })
    .then(({ openings }) => {
      if (openings.length === 0) {
        console.log('\nNo weekend openings found.');
      }
    })
    .catch(err => {
      console.error('Fatal error:', err.message);
      process.exit(1);
    });
} else {
  console.error(`Unknown command: ${command}. Use "watches" or "scan".`);
  process.exit(1);
}
