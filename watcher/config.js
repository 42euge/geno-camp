/**
 * Watch config CRUD — reads/writes YAML files in ~/.geno/camp-watches/.
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';

const WATCHES_DIR = join(homedir(), '.geno', 'camp-watches');

/** Ensure the watches directory exists. */
function ensureDir() {
  if (!existsSync(WATCHES_DIR)) {
    mkdirSync(WATCHES_DIR, { recursive: true });
  }
}

/**
 * Generate a filesystem-safe slug from a campground name.
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * List all watch configs.
 * @returns {Array<{slug: string, data: object}>}
 */
export function listWatches() {
  ensureDir();
  const files = readdirSync(WATCHES_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  return files.map(f => {
    const slug = f.replace(/\.ya?ml$/, '');
    const content = readFileSync(join(WATCHES_DIR, f), 'utf8');
    return { slug, data: yaml.load(content) };
  });
}

/**
 * Read a single watch config by slug.
 * @param {string} slug
 * @returns {object|null}
 */
export function getWatch(slug) {
  ensureDir();
  const filePath = join(WATCHES_DIR, `${slug}.yaml`);
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

/**
 * Create a new watch config.
 * @param {object} watchData - Watch config data (must include campground.name)
 * @returns {string} The slug used for the file.
 */
export function createWatch(watchData) {
  ensureDir();
  const slug = watchData.slug || slugify(watchData.campground?.name || 'watch');
  const filePath = join(WATCHES_DIR, `${slug}.yaml`);

  const data = {
    type: watchData.type || 'specific',
    campground: watchData.campground,
    dates: watchData.dates,
    notify: watchData.notify || { profile: 'camp-alerts' },
    status: watchData.status || 'watching',
    created: watchData.created || new Date().toISOString().split('T')[0],
    last_checked: watchData.last_checked || null,
    last_result: watchData.last_result || null,
  };

  writeFileSync(filePath, yaml.dump(data, { lineWidth: -1 }), 'utf8');
  return slug;
}

/**
 * Partially update an existing watch config.
 * @param {string} slug
 * @param {object} updates - Fields to merge into the existing config.
 * @returns {object} The updated config.
 */
export function updateWatch(slug, updates) {
  const existing = getWatch(slug);
  if (!existing) throw new Error(`Watch not found: ${slug}`);

  const updated = { ...existing, ...updates };
  const filePath = join(WATCHES_DIR, `${slug}.yaml`);
  writeFileSync(filePath, yaml.dump(updated, { lineWidth: -1 }), 'utf8');
  return updated;
}

/**
 * Remove a watch config.
 * @param {string} slug
 * @returns {boolean} True if the file existed and was removed.
 */
export function removeWatch(slug) {
  const filePath = join(WATCHES_DIR, `${slug}.yaml`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

/**
 * Get the watches directory path.
 * @returns {string}
 */
export function getWatchesDir() {
  ensureDir();
  return WATCHES_DIR;
}
