/**
 * Platform registry — maps platform names to their adapter modules.
 */

import * as recreationGov from './recreation-gov.js';
import * as waStateParks from './wa-state-parks.js';
import * as orStateParks from './or-state-parks.js';

const adapters = {
  'Recreation.gov': recreationGov,
  'WA State Parks': waStateParks,
  'OR State Parks': orStateParks,
};

/**
 * Get the adapter module for a platform name.
 * @param {string} platformName - e.g. "Recreation.gov"
 * @returns {object} The platform adapter with checkAvailability() and checkDate()
 * @throws {Error} If the platform is not supported.
 */
export function getAdapter(platformName) {
  const adapter = adapters[platformName];
  if (!adapter) {
    throw new Error(`Unknown platform: ${platformName}. Supported: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

/**
 * List all registered platform names.
 * @returns {string[]}
 */
export function listPlatforms() {
  return Object.keys(adapters);
}
