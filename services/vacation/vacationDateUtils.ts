import { DateTime } from 'luxon';

/**
 * Calculate vacation duration including weekends and holidays
 */
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const start = DateTime.fromJSDate(startDate).startOf('day');
  const end = DateTime.fromJSDate(endDate).startOf('day');
  
  // Calculate difference in days and add 1 to include both start and end dates
  return end.diff(start, 'days').days + 1;
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = DateTime.fromJSDate(date).weekday;
  // In Luxon, 6 is Saturday and 7 is Sunday
  return day === 6 || day === 7;
}

/**
 * Format a date to a standard display format
 */
export function formatDisplayDate(date: Date): string {
  return DateTime.fromJSDate(date).toFormat('MMM d, yyyy');
}

/**
 * Get standard date from ISO string or Date object
 */
export function standardizeDate(date: Date | string): DateTime {
  if (typeof date === 'string') {
    return DateTime.fromISO(date).startOf('day');
  }
  return DateTime.fromJSDate(date).startOf('day');
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = standardizeDate(date1);
  const d2 = standardizeDate(date2);
  return d1.hasSame(d2, 'day');
}