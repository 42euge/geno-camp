/**
 * OR State Parks (ReserveAmerica) availability checker.
 * Phase 2 stub — not yet implemented.
 */

export const platform = 'OR State Parks';

export async function checkAvailability(campgroundId, checkin, checkout) {
  throw new Error(`[or-state-parks] Not yet implemented. Use oregonstateparks.reserveamerica.com for OR state park availability.`);
}

export async function checkDate(campgroundId, date) {
  throw new Error(`[or-state-parks] Not yet implemented.`);
}
