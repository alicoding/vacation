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
  isHalfDay: boolean = false,
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
    
    const holidayDates = holidays.map((h) => 
      DateTime.fromJSDate(new Date(h.date)).toISODate(),
    );
    
    let count = 0;
    let current = start;
    
    while (current <= end) {
      // Skip weekends (6 = Saturday, 7 = Sunday)
      if (current.weekday < 6) {
        // Skip holidays
        if (!holidayDates.includes(current.toISODate())) {
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