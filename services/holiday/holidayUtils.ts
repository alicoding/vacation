import { DateTime } from 'luxon';

/**
 * Checks if a date is on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  return DateTime.fromJSDate(date).weekday >= 6; // 6 is Saturday, 7 is Sunday in Luxon
}
