'use server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase.server';
import { VacationBooking, VacationServiceError } from './vacationTypes';
import { calculateBusinessDays } from './vacationCalculationService';
import { DateTime } from 'luxon';

/**
 * Maps database vacation booking result to the VacationBooking interface
 * Following project type safety guidelines with proper checks
 */
function mapDbToVacationBooking(booking: any): VacationBooking | null {
  // Check if booking exists and has all required properties
  if (!booking || 
      !('id' in booking) || 
      !('user_id' in booking) || 
      !('start_date' in booking) || 
      !('end_date' in booking)) {
    return null;
  }
  
  return {
    id: booking.id,
    userId: booking.user_id,
    startDate: new Date(booking.start_date),
    endDate: new Date(booking.end_date),
    note: booking.note,
    createdAt: booking.created_at ? new Date(booking.created_at) : undefined,
    isHalfDay: booking.is_half_day ?? false,
    halfDayPortion: booking.half_day_portion,
  };
}

/**
 * Get all vacation bookings for a user
 */
export async function getVacationBookings(userId: string): Promise<VacationBooking[]> {
  try {
    // Create a server client with proper authentication
    const supabaseServer = createSupabaseServerClient(cookies());
    
    const { data: dbBookings, error } = await supabaseServer
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId) // Using user_id to match the database schema
      .order('start_date', { ascending: false });
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    // Transform the DB response to match the VacationBooking interface
    // Using proper type guards and null checks as per project guidelines
    const bookings: VacationBooking[] = (dbBookings || [])
      .map(mapDbToVacationBooking)
      .filter((booking): booking is VacationBooking => booking !== null);
    
    return bookings;
  } catch (error) {
    console.error('Error fetching vacation bookings:', error);
    throw new VacationServiceError(
      'Failed to fetch vacation bookings',
      'DATABASE_ERROR',
    );
  }
}

/**
 * Get total vacation days used for a user in a specified year
 */
export async function getVacationDaysUsed(
  userId: string,
  year: number,
): Promise<number> {
  try {
    // Create a server client with proper authentication
    const supabaseServer = createSupabaseServerClient(cookies());
    
    // First try to get user from users table
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('province')
      .eq('id', userId)
      .single();
    
    // If user doesn't exist in the users table, use default province
    let province = 'ON'; // Default to Ontario
    
    if (userError) {
      console.warn('User not found in users table, falling back to default province:', userError);
      
      // We can also try to get user info from auth.users if you have admin privileges
      try {
        const { data: authUser } = await supabaseServer.auth.getUser();
        if (authUser?.user) {
          // Extract province from user metadata if available
          province = authUser.user.user_metadata?.province || province;
          console.log('Using province from auth user metadata:', province);
        }
      } catch (adminError) {
        console.warn('Could not get user info:', adminError);
      }
    } else if (user) {
      province = user.province;
    }
    
    // Get all vacation bookings for the year using Luxon for edge compatibility
    const startOfYear = DateTime.fromObject({ year }, { zone: 'utc' }).startOf('year').toISO();
    const endOfYear = DateTime.fromObject({ year }, { zone: 'utc' }).endOf('year').toISO();
    
    if (!startOfYear || !endOfYear) {
      throw new VacationServiceError('Failed to create date range', 'DATE_ERROR');
    }
    
    // Note: Using the correct column name to match the database schema
    const { data: vacations, error } = await supabaseServer
      .from('vacation_bookings')
      .select('*')
      .eq('user_id', userId) // This is correct as it matches DB schema
      .gte('start_date', startOfYear)
      .lte('end_date', endOfYear);
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    // Calculate total business days for each booking
    let totalDays = 0;
    
    for (const vacation of vacations || []) {
      // Use Luxon DateTime for better edge compatibility
      const startDate = DateTime.fromISO(vacation.start_date).toJSDate();
      const endDate = DateTime.fromISO(vacation.end_date).toJSDate();
      
      const businessDays = await calculateBusinessDays(
        startDate,
        endDate,
        province,
        vacation.is_half_day,
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
      'DATABASE_ERROR',
    );
  }
}

/**
 * Get user's remaining vacation days for the year
 */
export async function getRemainingVacationDays(
  userId: string,
  year: number,
): Promise<number> {
  try {
    const supabaseServer = createSupabaseServerClient(cookies());
    
    // Get user's total vacation allocation
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('total_vacation_days')
      .eq('id', userId)
      .single();
    
    if (userError) {
      throw new VacationServiceError('User not found', 'NOT_FOUND');
    }
    
    const totalAllocation = user?.total_vacation_days || 0;
    
    // Get days used
    const daysUsed = await getVacationDaysUsed(userId, year);
    
    return Math.max(0, totalAllocation - daysUsed);
  } catch (error) {
    console.error('Error getting remaining vacation days:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to get remaining vacation days',
      'DATABASE_ERROR',
    );
  }
}