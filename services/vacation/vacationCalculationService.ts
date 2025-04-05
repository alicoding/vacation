'use server';
import { DateTime } from 'luxon';
import { getHolidaysInRange, HolidayWithTypeArray } from '../holiday/holidayService'; // Import HolidayWithTypeArray
import { VacationServiceError } from './vacationTypes'; // Keep VacationServiceError import
import { VacationBooking } from '@/types'; // Import only VacationBooking from @/types
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

/**
 * Calculates aggregated vacation statistics (used, remaining) based on total allowance,
 * booked vacations, and holidays, excluding weekends and holidays from calculations.
 */
export async function calculateVacationStats( // Add async keyword
  totalAllowance: number,
  vacations: VacationBooking[],
  holidays: HolidayWithTypeArray[], // Expect HolidayWithTypeArray where date is Date object
): Promise<{ used: number; remaining: number; total: number }> { // Return a Promise
  if (totalAllowance < 0) {
    // Handle invalid allowance
    console.warn('[calculateVacationStats] Invalid totalAllowance:', totalAllowance);
    return { used: 0, remaining: 0, total: 0 };
  }
   if (!vacations || !holidays) {
     console.warn('[calculateVacationStats] Missing vacations or holidays data.');
     // If data is missing, return total allowance as remaining
     return { used: 0, remaining: totalAllowance, total: totalAllowance };
   }


  let usedBusinessDays = 0;

  // Prepare a set of holiday date strings (YYYY-MM-DD) for efficient lookup
  const holidayDateStrings = new Set<string>(
    holidays
      .map((h) => {
        // Convert Date object to ISO date string using Luxon
        const dt = DateTime.fromJSDate(h.date, { zone: 'utc' });
        return dt.isValid ? dt.toISODate() : null;
      })
      .filter((d): d is string => d !== null), // Keep filtering nulls
  ); // Add semicolon to terminate the Set statement
  console.log('[calculateVacationStats] Holiday Dates Set:', Array.from(holidayDateStrings)); // Log holidays);
  console.log('[calculateVacationStats] Input Vacations:', JSON.stringify(vacations)); // Log vacations input

  vacations.forEach((vacation) => {
    console.log(`[calculateVacationStats] Processing vacation ID: ${vacation.id ?? 'N/A'}`, vacation); // Log each vacation start
    // Ensure dates are valid before proceeding
    // Use correct property names from the VacationBooking type: start_date, end_date
    const start = DateTime.fromISO(String(vacation.start_date), { zone: 'utc' }).startOf('day');
    const end = DateTime.fromISO(String(vacation.end_date), { zone: 'utc' }).startOf('day');

    // Use optional chaining for id in case vacation object structure varies
    if (!start.isValid || !end.isValid || start > end) {
        console.warn(`[calculateVacationStats] Skipping vacation with invalid dates: ${vacation.id ?? 'Unknown ID'}`);
        return; // Skip this vacation if dates are invalid or start is after end
    }


    let current = start;
    let vacationDuration = 0;

    while (current <= end) {
      const currentDateStr = current.toISODate();
      const isWeekday = current.weekday >= 1 && current.weekday <= 5; // Monday to Friday

      const isHoliday = currentDateStr ? holidayDateStrings.has(currentDateStr) : false; // Check if holiday

      // Log check for current date
      console.log(`[calculateVacationStats]   - Checking Date: ${currentDateStr}, Weekday: ${isWeekday}, Holiday: ${isHoliday}`);

      // Check if it's a weekday and not a holiday
      if (isWeekday && currentDateStr && !isHoliday) {
         // Handle half-days using correct property name: is_half_day
         if (vacation.is_half_day && current.equals(start) && start.equals(end)) {
             vacationDuration += 0.5; // Add 0.5 for a single half-day
             console.log(`[calculateVacationStats]     -> Counted 0.5 day (Half-day). Duration now: ${vacationDuration}`);
         } else {
             vacationDuration += 1; // Add a full day
             console.log(`[calculateVacationStats]     -> Counted 1 day. Duration now: ${vacationDuration}`);
         }
      } else {
          console.log(`[calculateVacationStats]     -> Skipped (Weekend or Holiday)`);
      }
      current = current.plus({ days: 1 });
    }
     // Special handling for half-day that spans only one day
     // Note: The logic above already handles single half-days.
     // If half-days could span multiple days or have different start/end logic,
     // this part might need adjustment based on the specific definition of isHalfDay.

    usedBusinessDays += vacationDuration;
  });

  const remaining = Math.max(0, totalAllowance - usedBusinessDays); // Ensure remaining is not negative

  console.log(`[calculateVacationStats] Total Used Business Days Calculated: ${usedBusinessDays}`); // Log final count
  return {
    used: usedBusinessDays,
    remaining: remaining,
    total: totalAllowance,
  };
}
