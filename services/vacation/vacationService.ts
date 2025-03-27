'use server';

import { DateTime } from 'luxon';
import { supabase } from '@/lib/supabase';
import { VacationBooking, VacationServiceError } from './vacationTypes';
import { getHolidaysInRange } from '../holiday/holidayService';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Check if dates are overlapping with existing bookings
 */
export async function checkOverlappingBookings(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('vacation_bookings')
      .select('*')
      .eq('userId', userId)
      // Find bookings that overlap with the new date range
      .or(`start_date.lte.${endDate.toISOString()},end_date.gte.${startDate.toISOString()}`);
    
    // Exclude the current booking if updating
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data: existingBookings, error } = await query;
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    return existingBookings && existingBookings.length > 0;
  } catch (error) {
    console.error('Error checking overlapping bookings:', error);
    throw new VacationServiceError(
      'Failed to check overlapping bookings',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Create a new vacation booking
 */
export async function createVacationBooking(
  userId: string,
  startDate: Date,
  endDate: Date,
  note?: string,
  isHalfDay: boolean = false,
  halfDayPortion?: string
): Promise<VacationBooking> {
  try {
    // Check for overlapping bookings
    const hasOverlap = await checkOverlappingBookings(userId, startDate, endDate);
    
    if (hasOverlap) {
      throw new VacationServiceError(
        'This vacation overlaps with an existing booking',
        'OVERLAPPING_BOOKING'
      );
    }
    
    // Create the booking
    const { data: booking, error } = await supabase
      .from('vacation_bookings')
      .insert({
        userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        note,
        is_half_day: isHalfDay,
        half_day_portion: halfDayPortion,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    return booking;
  } catch (error) {
    console.error('Error creating vacation booking:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to create vacation booking',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Get all vacation bookings for a user
 */
export async function getVacationBookings(userId: string): Promise<VacationBooking[]> {
  try {
    const { data: bookings, error } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('userId', userId)
      .order('start_date', { ascending: false });
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    return bookings || [];
  } catch (error) {
    console.error('Error fetching vacation bookings:', error);
    throw new VacationServiceError(
      'Failed to fetch vacation bookings',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Delete a vacation booking by ID
 */
export async function deleteVacationBooking(
  id: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('vacation_bookings')
      .delete()
      .eq('id', id)
      .eq('userId', userId);
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
  } catch (error) {
    console.error('Error deleting vacation booking:', error);
    throw new VacationServiceError(
      'Failed to delete vacation booking',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Calculate business days (working days) between two dates, excluding weekends and holidays
 */
export async function calculateBusinessDays(
  startDate: Date,
  endDate: Date,
  province: string,
  isHalfDay: boolean = false
): Promise<number> {
  try {
    const start = DateTime.fromJSDate(startDate).startOf('day');
    const end = DateTime.fromJSDate(endDate).startOf('day');
    
    // Get holidays in the range
    const holidays = await getHolidaysInRange(
      start.toJSDate(),
      end.toJSDate(),
      province
    );
    
    const holidayDates = holidays.map(h => 
      DateTime.fromJSDate(new Date(h.date)).toISODate()
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
      'CALCULATION_ERROR'
    );
  }
}

/**
 * Update an existing vacation booking
 */
export async function updateVacationBooking(
  id: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  note?: string,
  isHalfDay: boolean = false,
  halfDayPortion?: string
): Promise<VacationBooking> {
  try {
    // Find the existing booking
    const { data: existingBooking, error: findError } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('id', id)
      .eq('userId', userId)
      .single();
    
    if (findError || !existingBooking) {
      throw new VacationServiceError(
        'Vacation booking not found',
        'NOT_FOUND'
      );
    }
    
    // Check for overlapping bookings (excluding this booking)
    const hasOverlap = await checkOverlappingBookings(userId, startDate, endDate, id);
    
    if (hasOverlap) {
      throw new VacationServiceError(
        'This vacation overlaps with an existing booking',
        'OVERLAPPING_BOOKING'
      );
    }
    
    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('vacation_bookings')
      .update({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        note,
        is_half_day: isHalfDay,
        half_day_portion: halfDayPortion
      })
      .eq('id', id)
      .eq('userId', userId)
      .select()
      .single();
    
    if (updateError) {
      throw new VacationServiceError(updateError.message, 'DATABASE_ERROR');
    }
    
    return updatedBooking;
  } catch (error) {
    console.error('Error updating vacation booking:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to update vacation booking',
      'DATABASE_ERROR'
    );
  }
}

/**
 * Get total vacation days used for a user in a specified year
 */
export async function getVacationDaysUsed(
  userId: string,
  year: number
): Promise<number> {
  try {
    // Get user to check province
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('province')
      .eq('id', userId)
      .single();
    
    if (userError || !user) {
      throw new VacationServiceError('User not found', 'NOT_FOUND');
    }
    
    // Get all vacation bookings for the year
    const startOfYear = new Date(year, 0, 1).toISOString();
    const endOfYear = new Date(year, 11, 31).toISOString();
    
    const { data: vacations, error } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('userId', userId)
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    // Calculate total business days for each booking
    let totalDays = 0;
    
    for (const vacation of vacations || []) {
      const businessDays = await calculateBusinessDays(
        new Date(vacation.start_date),
        new Date(vacation.end_date),
        user.province,
        vacation.is_half_day
      );
      
      totalDays += businessDays;
    }
    
    return totalDays;
  } catch (error) {
    console.error('Error getting vacation days used:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to get vacation days used',
      'DATABASE_ERROR'
    );
  }
}
