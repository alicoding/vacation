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
  if (totalAllowance < 0) {
    return { used: 0, remaining: 0, total: 0 };
  }
  if (!vacations || !holidays) {
    return { used: 0, remaining: totalAllowance, total: totalAllowance };
  }

  let usedBusinessDays = 0;

  const holidayDateStrings = new Set<string>(
    holidays
      .map((h) => {
        let isoDateStr: string | null = null;
        if (typeof h.date === 'string') {
          isoDateStr = h.date;
        } else if (h.date instanceof Date) {
          isoDateStr = h.date.toISOString();
        } else {
          return null;
        }

        if (!isoDateStr) return null;

        const dt = DateTime.fromISO(isoDateStr, { zone: 'utc' });

        if (!dt.isValid) {
          return null;
        }
        return dt.toISODate();
      })
      .filter((d): d is string => d !== null),
  );

  vacations.forEach((vacation) => {
    const start = DateTime.fromISO(String(vacation.start_date), {
      zone: 'utc',
    }).startOf('day');
    const end = DateTime.fromISO(String(vacation.end_date), {
      zone: 'utc',
    }).startOf('day');

    if (!start.isValid || !end.isValid || start > end) {
      return; // Skip invalid dates
    }

    let current = start;
    let vacationDuration = 0;

    while (current <= end) {
      const currentDateStr = current.toISODate();
      const isWeekday = current.weekday >= 1 && current.weekday <= 5; // Monday to Friday

      const isHoliday = currentDateStr
        ? holidayDateStrings.has(currentDateStr)
        : false;

      if (isWeekday && currentDateStr && !isHoliday) {
        if (
          vacation.is_half_day &&
          current.equals(start) &&
          start.equals(end)
        ) {
          vacationDuration += 0.5; // Single half-day
        } else {
          vacationDuration += 1; // Full day
        }
      }
      current = current.plus({ days: 1 });
    }
    usedBusinessDays += vacationDuration;
  });

  const remaining = Math.max(0, totalAllowance - usedBusinessDays);

  return {
    used: usedBusinessDays,
    remaining: remaining,
    total: totalAllowance,
  };
}

// --- Added Code ---
interface HolidayInput {
  date: Date | string;
  type: string[];
}

/**
 * Calculate business days (working days) between two dates, excluding weekends and holidays.
 */
export function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  holidays: HolidayInput[],
  isHalfDay = false,
): number {
  try {
    const start = DateTime.fromJSDate(startDate, { zone: 'utc' }).startOf(
      'day',
    );
    const end = DateTime.fromJSDate(endDate, { zone: 'utc' }).startOf('day');

    const holidayDateStrings = new Set<string>(
      holidays
        .map((h) => {
          let isoDateStr: string | null = null;
          if (h.date instanceof Date) {
            isoDateStr = h.date.toISOString();
          } else if (typeof h.date === 'string') {
            isoDateStr = h.date;
          } else {
            return null;
          }

          if (!isoDateStr) return null;

          const dt = DateTime.fromISO(isoDateStr, { zone: 'utc' });

          if (!dt.isValid) {
            return null;
          }
          return dt.toISODate();
        })
        .filter((d): d is string => d !== null),
    );

    let count = 0;
    let current = start;

    while (current <= end) {
      const currentDateStr = current.toISODate();
      const isWeekday = current.weekday >= 1 && current.weekday <= 5;
      const isHoliday =
        currentDateStr && holidayDateStrings.has(currentDateStr);

      if (isWeekday && !isHoliday) {
        count++;
      }
      current = current.plus({ days: 1 });
    }

    const isSingleDayRange = start.equals(end);
    if (isHalfDay && isSingleDayRange && count > 0) {
      return 0.5; // Single day half-day adjustment
    } else if (isHalfDay && !isSingleDayRange && count >= 0.5) {
      // Multi-day half-day adjustment (subtract 0.5)
      return count - 0.5;
    }

    return count; // Return full count or adjusted count
  } catch (error) {
    // In case of unexpected error during calculation
    return 0;
  }
}
// --- End Added Code ---
