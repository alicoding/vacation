'use server';
import { DateTime } from 'luxon';
import { getHolidaysInRange } from '../holiday/holidayService';
import { VacationServiceError } from './vacationTypes';

/**
 * Calculate business days (working days) between two dates, excluding weekends and holidays
 */
export async function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  province: string,
  isHalfDay = false,
): Promise<number> {
  try {
    const start = DateTime.fromJSDate(startDate).startOf('day');
    const end = DateTime.fromJSDate(endDate).startOf('day');

    // Get holidays in the range
    const holidays = await getHolidaysInRange(
      start.toJSDate(),
      end.toJSDate(),
      province,
    );

    console.log(
      '[calculateBusinessDays] Raw holidays from getHolidaysInRange:',
      JSON.stringify(holidays),
    ); // Add log

    const holidayDates = holidays
      .map((h) => {
        // Ensure h.date is treated as a string before parsing
        const dateStr = typeof h.date === 'string' ? h.date : String(h.date);
        // Parse directly using Luxon in UTC to avoid timezone issues
        const dt = DateTime.fromISO(dateStr, { zone: 'utc' });
        if (!dt.isValid) {
          console.error(
            `[calculateBusinessDays] Invalid date encountered in holiday mapping: ${dateStr}`,
          );
          return null; // Handle invalid dates
        }
        return dt.toISODate(); // Return 'YYYY-MM-DD' string
      })
      .filter((d): d is string => d !== null); // Filter out any nulls from invalid dates
    console.log(
      '[calculateBusinessDays] Processed holidayDates for check:',
      JSON.stringify(holidayDates),
    ); // Add log

    let count = 0;
    let current = start;

    while (current <= end) {
      // Skip weekends (6 = Saturday, 7 = Sunday)
      const currentDateStr = current.toISODate(); // Get ISO date string
      if (current.weekday < 6 && currentDateStr) {
        // Check if it's a weekday AND the date string is valid
        // Skip holidays
        if (!holidayDates.includes(currentDateStr)) {
          count++;
        }
      }

      current = current.plus({ days: 1 });
    }

    // Adjust for half-day if needed
    return isHalfDay ? count - 0.5 : count;
  } catch (error) {
    console.error('Error calculating business days:', error);
    throw new VacationServiceError(
      'Failed to calculate business days',
      'CALCULATION_ERROR',
    );
  }
}
