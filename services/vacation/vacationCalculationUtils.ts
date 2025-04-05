import { DateTime } from 'luxon';
import { HolidayWithTypeArray } from '../holiday/holidayService'; // Import HolidayWithTypeArray
import { VacationBooking } from '@/types'; // Import only VacationBooking from @/types

/**
 * Calculates aggregated vacation statistics (used, remaining) based on total allowance,
 * booked vacations, and holidays, excluding weekends and holidays from calculations.
 */
export function calculateVacationStats(
  totalAllowance: number,
  vacations: VacationBooking[],
  holidays: HolidayWithTypeArray[], // Expect HolidayWithTypeArray where date is Date object
): { used: number; remaining: number; total: number } {
  // Return the object directly
  if (totalAllowance < 0) {
    // Handle invalid allowance
    console.warn(
      '[calculateVacationStats] Invalid totalAllowance:',
      totalAllowance,
    );
    return { used: 0, remaining: 0, total: 0 };
  }
  if (!vacations || !holidays) {
    console.warn(
      '[calculateVacationStats] Missing vacations or holidays data.',
    );
    // If data is missing, return total allowance as remaining
    return { used: 0, remaining: totalAllowance, total: totalAllowance };
  }

  let usedBusinessDays = 0;

  // Prepare a set of holiday date strings (YYYY-MM-DD) for efficient lookup
  const holidayDateStrings = new Set<string>(
    holidays
      .map((h) => {
        // Robust date parsing (handle string or Date object)
        let isoDateStr: string | null = null;
        if (typeof h.date === 'string') {
          isoDateStr = h.date;
        } else if (h.date instanceof Date) {
          isoDateStr = h.date.toISOString();
        } else {
          console.error(
            `[calculateVacationStats] Unexpected holiday date type: ${typeof h.date}`,
            h.date,
          );
          return null;
        }

        if (!isoDateStr) return null;

        // Parse the ISO string, ensuring UTC context
        const dt = DateTime.fromISO(isoDateStr, { zone: 'utc' });

        if (!dt.isValid) {
          console.error(
            `[calculateVacationStats] Invalid date encountered after processing: ${isoDateStr}`,
            dt.invalidReason,
            dt.invalidExplanation,
          );
          return null;
        }
        // Return the date part 'YYYY-MM-DD'
        return dt.toISODate();
      })
      .filter((d): d is string => d !== null),
  ); // Add semicolon to terminate the Set statement

  vacations.forEach((vacation) => {
    // Ensure dates are valid before proceeding
    // Use correct property names from the VacationBooking type: start_date, end_date
    const start = DateTime.fromISO(String(vacation.start_date), {
      zone: 'utc',
    }).startOf('day');
    const end = DateTime.fromISO(String(vacation.end_date), {
      zone: 'utc',
    }).startOf('day');

    // Use optional chaining for id in case vacation object structure varies
    if (!start.isValid || !end.isValid || start > end) {
      console.warn(
        `[calculateVacationStats] Skipping vacation with invalid dates: ${vacation.id ?? 'Unknown ID'}`,
      );
      return; // Skip this vacation if dates are invalid or start is after end
    }

    let current = start;
    let vacationDuration = 0;

    while (current <= end) {
      const currentDateStr = current.toISODate();
      const isWeekday = current.weekday >= 1 && current.weekday <= 5; // Monday to Friday

      const isHoliday = currentDateStr
        ? holidayDateStrings.has(currentDateStr)
        : false; // Check if holiday

      // Log check for current date
      console.log(
        `[calculateVacationStats]   - Checking Date: ${currentDateStr}, Weekday: ${isWeekday}, Holiday: ${isHoliday}`,
      );

      // Check if it's a weekday and not a holiday
      if (isWeekday && currentDateStr && !isHoliday) {
        // Handle half-days using correct property name: is_half_day
        if (
          vacation.is_half_day &&
          current.equals(start) &&
          start.equals(end)
        ) {
          vacationDuration += 0.5; // Add 0.5 for a single half-day
          console.log(
            `[calculateVacationStats]     -> Counted 0.5 day (Half-day). Duration now: ${vacationDuration}`,
          );
        } else {
          vacationDuration += 1; // Add a full day
          console.log(
            `[calculateVacationStats]     -> Counted 1 day. Duration now: ${vacationDuration}`,
          );
        }
      } else {
        console.log(
          `[calculateVacationStats]     -> Skipped (Weekend or Holiday)`,
        );
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

  console.log(
    `[calculateVacationStats] Total Used Business Days Calculated: ${usedBusinessDays}`,
  ); // Log final count
  return {
    used: usedBusinessDays,
    remaining: remaining,
    total: totalAllowance,
  };
}

// --- Added Code ---
// Define the input type based on HolidayWithTypeArray structure
interface HolidayInput {
  date: Date | string;
  type: string[];
} // Allow string date input

/**
 * Calculate business days (working days) between two dates, excluding weekends and holidays.
 * This is now a synchronous function.
 */
export function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  holidays: HolidayInput[], // Accept holidays array
  isHalfDay = false,
): number {
  // Change return type to number
  try {
    // Interpret the incoming JS Date objects as UTC to prevent local timezone shifts
    const start = DateTime.fromJSDate(startDate, { zone: 'utc' }).startOf(
      'day',
    );
    const end = DateTime.fromJSDate(endDate, { zone: 'utc' }).startOf('day');

    // Prepare a set of holiday date strings (YYYY-MM-DD) from the input array
    const holidayDateStrings = new Set<string>(
      holidays
        .map((h) => {
          // Use robust date parsing for the input holidays
          let isoDateStr: string | null = null;
          if (h.date instanceof Date) {
            isoDateStr = h.date.toISOString();
          } else if (typeof h.date === 'string') {
            // If it's a string, try parsing it as ISO
            isoDateStr = h.date;
          } else {
            console.error(
              `[calculateBusinessDays] Unexpected holiday date type in input: ${typeof h.date}`,
              h.date,
            );
            return null;
          }

          if (!isoDateStr) return null;

          // Parse the ISO string, ensuring UTC context
          const dt = DateTime.fromISO(isoDateStr, { zone: 'utc' });

          if (!dt.isValid) {
            console.error(
              `[calculateBusinessDays] Invalid date in input holiday: ${isoDateStr}`,
              dt.invalidReason,
              dt.invalidExplanation,
            );
            return null;
          }
          // Return the date part 'YYYY-MM-DD'
          return dt.toISODate();
        })
        .filter((d): d is string => d !== null), // Filter out nulls from invalid dates
    );

    // Add detailed logging here
    console.log(
      `[calculateBusinessDays] Inputs - Start: ${start.toISODate()}, End: ${end.toISODate()}, isHalfDay: ${isHalfDay}`,
    );
    console.log(
      `[calculateBusinessDays] Holiday Set: ${JSON.stringify(Array.from(holidayDateStrings))}`,
    );

    let count = 0;
    let current = start;

    // Loop through the date range
    while (current <= end) {
      const currentDateStr = current.toISODate();
      const isWeekday = current.weekday >= 1 && current.weekday <= 5;
      const isHoliday =
        currentDateStr && holidayDateStrings.has(currentDateStr);
      console.log(
        `[calculateBusinessDays] Checking ${currentDateStr}: Weekday=${isWeekday}, Holiday=${isHoliday}`,
      ); // Log check

      // Check if it's a weekday (Monday=1 to Friday=5)
      if (isWeekday) {
        // Check if it's NOT a holiday (and currentDateStr is valid)
        if (!isHoliday) {
          console.log(`[calculateBusinessDays] Counting ${currentDateStr}`); // Log count increment
          count++;
        } else {
          console.log(
            `[calculateBusinessDays] Skipping ${currentDateStr} (Holiday)`,
          ); // Log holiday skip
        }
      } else {
        console.log(
          `[calculateBusinessDays] Skipping ${currentDateStr} (Weekend)`,
        ); // Log weekend skip
      }
      current = current.plus({ days: 1 });
    }

    console.log(
      `[calculateBusinessDays] Raw count before half-day check: ${count}`,
    ); // Log raw count
    // Adjust for half-day if needed (only applies if the range is a single day)
    const isSingleDayRange = start.equals(end);
    if (isHalfDay && isSingleDayRange && count > 0) {
      // If it's a single day that wasn't a weekend/holiday, adjust count
      console.log(
        `[calculateBusinessDays] Applying single-day half-day adjustment. Returning 0.5`,
      );
      return 0.5;
    } else if (isHalfDay && !isSingleDayRange && count >= 0.5) {
      // Ensure count is positive before subtracting
      // Apply half-day adjustment for multi-day ranges by subtracting 0.5
      // This aligns with the likely expectation for vacation statistics.
      const adjustedCount = count - 0.5;
      console.log(
        `[calculateBusinessDays] Multi-day half-day detected. Adjusting count from ${count} to ${adjustedCount}`,
      );
      return adjustedCount;
    }

    console.log(
      `[calculateBusinessDays] No half-day adjustment needed or applied. Returning: ${count}`,
    );
    return count; // Return the final count
  } catch (error) {
    console.error('Error calculating business days:', error);
    // Throw error or return a rejected Promise if needed, but returning 0 might be acceptable
    return 0;
  }
}
// --- End Added Code ---
