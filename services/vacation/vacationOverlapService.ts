'use server';
import { DateTime } from 'luxon';
import { cookies } from 'next/headers';
import { createServerClient } from '@/utils/supabase-server';
import { VacationServiceError } from './vacationTypes';

/**
 * Check if dates are overlapping with existing bookings
 */
export async function checkOverlappingBookings(
  userId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
): Promise<boolean> {
  try {
    // Create a server client with proper authentication
    const cookieStore = cookies();
    const supabaseServer = createServerClient(cookieStore);
    
    // Standardize date format for comparison (using start of day)
    const start = DateTime.fromJSDate(startDate).startOf('day');
    const end = DateTime.fromJSDate(endDate).startOf('day');
    
    // Get all bookings for this user
    let query = supabaseServer
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId);
    
    // Exclude the current booking if updating
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data: existingBookings, error } = await query;
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    // If no bookings, there can't be any overlap
    if (!existingBookings || existingBookings.length === 0) {
      return false;
    }
    
    // Manual check for overlaps with better debugging
    console.log(`Checking for overlaps with new booking: ${start.toISODate()} to ${end.toISODate()}`);
    
    // Check each booking for overlap
    for (const booking of existingBookings) {
      const bookingStart = DateTime.fromISO(booking.start_date).startOf('day');
      const bookingEnd = DateTime.fromISO(booking.end_date).startOf('day');
      
      // Overlap occurs when:
      // 1. Start date is during an existing booking, or
      // 2. End date is during an existing booking, or
      // 3. Booking completely contains the new date range
      const hasOverlap = (
        (start >= bookingStart && start <= bookingEnd) ||
        (end >= bookingStart && end <= bookingEnd) ||
        (start <= bookingStart && end >= bookingEnd)
      );
      
      console.log(`Comparing with existing: ${bookingStart.toISODate()} to ${bookingEnd.toISODate()} - Overlap: ${hasOverlap}`);
      
      if (hasOverlap) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking overlapping bookings:', error);
    throw new VacationServiceError(
      'Failed to check overlapping bookings',
      'DATABASE_ERROR',
    );
  }
}