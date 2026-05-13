/**
 * Notification message builder — transforms watcher results into notification payloads.
 */

/**
 * Build an alert for a specific watch that found availability.
 *
 * @param {object} watch - The watch config data.
 * @param {object} result - The availability result from checkAvailability().
 * @returns {{title: string, body: string, url: string}}
 */
export function buildWatchAlert(watch, result) {
  const campName = watch.campground?.name || 'Unknown campground';
  const checkin = watch.dates?.checkin || '?';
  const checkout = watch.dates?.checkout || '?';
  const siteCount = result.count || 0;
  const siteWord = siteCount === 1 ? 'site' : 'sites';

  const siteList = (result.sites || [])
    .slice(0, 5)
    .map(s => s.site || s.siteId)
    .join(', ');
  const moreText = siteCount > 5 ? ` (+${siteCount - 5} more)` : '';

  return {
    title: `${campName}: ${siteCount} ${siteWord} available!`,
    body: [
      `Dates: ${checkin} to ${checkout}`,
      `Available ${siteWord}: ${siteList}${moreText}`,
      `Book now before they're gone!`,
    ].join('\n'),
    url: watch.campground?.url || '',
  };
}

/**
 * Build a summary of all openings found by the scanner.
 *
 * @param {Array<{campground: string, weekend: string, count: number, campgroundId: string}>} openings
 * @returns {{title: string, body: string}}
 */
export function buildScanSummary(openings) {
  if (!openings || openings.length === 0) {
    return {
      title: 'Camp scan: No openings found',
      body: 'No weekend availability found across scanned campgrounds.',
    };
  }

  const totalSites = openings.reduce((sum, o) => sum + o.count, 0);
  const uniqueCampgrounds = [...new Set(openings.map(o => o.campground))];

  const lines = openings.map(o =>
    `  ${o.campground} | ${o.weekend} | ${o.count} site${o.count === 1 ? '' : 's'}`
  );

  return {
    title: `Camp scan: ${openings.length} weekend${openings.length === 1 ? '' : 's'} open across ${uniqueCampgrounds.length} campground${uniqueCampgrounds.length === 1 ? '' : 's'}`,
    body: [
      `Found ${totalSites} total available site${totalSites === 1 ? '' : 's'}:`,
      '',
      ...lines,
    ].join('\n'),
  };
}
