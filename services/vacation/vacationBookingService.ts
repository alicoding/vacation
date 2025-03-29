'use server';
import { DateTime } from 'luxon';
import { cookies } from 'next/headers';
import { createServerClient, createServiceClient } from '@/utils/supabase-server';
import { VacationBooking, VacationServiceError } from './vacationTypes';
import { checkOverlappingBookings } from './vacationOverlapService';
import { syncVacationToCalendar } from '@/utils/googleCalendar';

/**
 * Create a new vacation booking
 */
export async function createVacationBooking(
  userId: string,
  startDate: Date,
  endDate: Date,
  note?: string,
  isHalfDay: boolean = false,
  halfDayPortion?: string,
): Promise<VacationBooking> {
  try {
    // Create a server client with proper authentication
    const cookieStore = cookies();
    const supabaseServer = createServerClient(cookieStore);
    
    // First check if the user exists in the users table
    const { data: existingUser, error: userError } = await supabaseServer
      .from('users')
      .select('id, calendar_sync_enabled')
      .eq('id', userId)
      .single();
    
    // Default calendar sync setting
    let calendarSyncEnabled = false;
    
    // If user doesn't exist, create a user record first
    if (userError && userError.code === 'PGRST116') {
      // Get user from auth
      const { data: authUser } = await supabaseServer.auth.getUser();
      
      if (authUser?.user) {
        // Use service role client to bypass RLS when creating user record
        const serviceClient = createServiceClient();
        
        // Create user in the users table - only include columns that exist
        const { error: createUserError } = await serviceClient
          .from('users')
          .insert({
            id: userId,
            email: authUser.user.email,
            province: 'ON', // Default to Ontario
            created_at: new Date().toISOString(),
            calendar_sync_enabled: false,
          });
        
        if (createUserError) {
          console.error('Error creating user record:', createUserError);
          throw new VacationServiceError('Failed to create user record', 'DATABASE_ERROR');
        }
      }
    } else if (existingUser) {
      calendarSyncEnabled = existingUser.calendar_sync_enabled || false;
    }
    
    // Check for overlapping bookings
    const hasOverlap = await checkOverlappingBookings(userId, startDate, endDate);
    
    if (hasOverlap) {
      throw new VacationServiceError(
        'This vacation overlaps with an existing booking',
        'OVERLAPPING_BOOKING',
      );
    }
    
    // Create the booking using the authenticated client
    const { data: booking, error } = await supabaseServer
      .from('vacation_bookings')
      .insert({
        user_id: userId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        note,
        is_half_day: isHalfDay,
        half_day_portion: halfDayPortion,
        created_at: new Date().toISOString(),
        sync_status: calendarSyncEnabled ? 'pending' : 'disabled',
      })
      .select()
      .single();
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
    
    // If calendar sync is enabled for the user, sync this vacation to Google Calendar
    if (calendarSyncEnabled && booking) {
      try {
        await syncVacationToCalendar(userId, {
          id: booking.id,
          title: 'Vacation',
          note: booking.note,
          start_date: booking.start_date,
          end_date: booking.end_date,
        });
      } catch (syncError) {
        console.error('Failed to sync vacation to Google Calendar:', syncError);
        // We don't throw here - we'll just record the sync failure in the database
        // and let the user know they can manually sync later
        await supabaseServer
          .from('vacation_bookings')
          .update({
            sync_status: 'failed',
            sync_error: (syncError as Error).message,
            last_sync_attempt: new Date().toISOString(),
          })
          .eq('id', booking.id);
      }
    }
    
    return booking;
  } catch (error) {
    console.error('Error creating vacation booking:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to create vacation booking',
      'DATABASE_ERROR',
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
  halfDayPortion?: string,
): Promise<VacationBooking> {
  try {
    // Create a server client with proper authentication
    const cookieStore = cookies();
    const supabaseServer = createServerClient(cookieStore);
    
    // Check if calendar sync is enabled for this user
    const { data: userData } = await supabaseServer
      .from('users')
      .select('calendar_sync_enabled')
      .eq('id', userId)
      .single();
      
    const calendarSyncEnabled = userData?.calendar_sync_enabled || false;
    
    // Find the existing booking
    const { data: existingBooking, error: findError } = await supabaseServer
      .from('vacation_bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (findError || !existingBooking) {
      throw new VacationServiceError(
        'Vacation booking not found',
        'NOT_FOUND',
      );
    }
    
    // Check for overlapping bookings (excluding this booking)
    const hasOverlap = await checkOverlappingBookings(userId, startDate, endDate, id);
    
    if (hasOverlap) {
      throw new VacationServiceError(
        'This vacation overlaps with an existing booking',
        'OVERLAPPING_BOOKING',
      );
    }
    
    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabaseServer
      .from('vacation_bookings')
      .update({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        note,
        is_half_day: isHalfDay,
        half_day_portion: halfDayPortion,
        // If calendar sync is enabled, set sync_status to pending for update
        ...(calendarSyncEnabled ? {
          sync_status: existingBooking.google_event_id ? 'pending' : 'disabled',
        } : {}),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (updateError) {
      throw new VacationServiceError(updateError.message, 'DATABASE_ERROR');
    }
    
    // If calendar sync is enabled and there's a change in dates or note, update Google Calendar
    if (calendarSyncEnabled && updatedBooking) {
      const datesChanged = 
        updatedBooking.start_date !== existingBooking.start_date || 
        updatedBooking.end_date !== existingBooking.end_date;
      const noteChanged = updatedBooking.note !== existingBooking.note;
        
      if (datesChanged || noteChanged) {
        try {
          await syncVacationToCalendar(userId, {
            id: updatedBooking.id,
            title: 'Vacation',
            note: updatedBooking.note,
            start_date: updatedBooking.start_date,
            end_date: updatedBooking.end_date,
            google_event_id: existingBooking.google_event_id,
          });
        } catch (syncError) {
          console.error('Failed to update vacation in Google Calendar:', syncError);
          // We don't throw here - we'll just record the sync failure in the database
          await supabaseServer
            .from('vacation_bookings')
            .update({
              sync_status: 'failed',
              sync_error: (syncError as Error).message,
              last_sync_attempt: new Date().toISOString(),
            })
            .eq('id', updatedBooking.id);
        }
      }
    }
    
    return updatedBooking;
  } catch (error) {
    console.error('Error updating vacation booking:', error);
    if (error instanceof VacationServiceError) {
      throw error;
    }
    throw new VacationServiceError(
      'Failed to update vacation booking',
      'DATABASE_ERROR',
    );
  }
}

/**
 * Delete a vacation booking by ID
 */
export async function deleteVacationBooking(
  id: string,
  userId: string,
): Promise<void> {
  try {
    // Create a server client with proper authentication
    const cookieStore = cookies();
    const supabaseServer = createServerClient(cookieStore);
    
    const { error } = await supabaseServer
      .from('vacation_bookings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) {
      throw new VacationServiceError(error.message, 'DATABASE_ERROR');
    }
  } catch (error) {
    console.error('Error deleting vacation booking:', error);
    throw new VacationServiceError(
      'Failed to delete vacation booking',
      'DATABASE_ERROR',
    );
  }
}