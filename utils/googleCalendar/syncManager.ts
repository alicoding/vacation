import { createDirectClient } from '../supabase';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './eventManager';
import { VacationEventData } from './types';

/**
 * Sync a single vacation booking to Google Calendar
 * Creates, updates, or skips based on existing event ID and sync status
 * @returns The Google Calendar event ID if successful, null otherwise
 */
export async function syncVacationToCalendar(
  userId: string,
  vacation: VacationEventData,
): Promise<string | null> {
  try {
    const supabase = createDirectClient();
    
    // If the vacation already has a Google Calendar event ID, update it
    if (vacation.google_event_id) {
      const updatedEvent = await updateCalendarEvent(
        userId,
        vacation.google_event_id,
        vacation,
      );
      
      // Update the sync status
      await supabase
        .from('vacation_bookings')
        .update({
          sync_status: 'synced',
          last_sync_attempt: new Date().toISOString(),
          sync_error: null,
        })
        .eq('id', vacation.id);
        
      return updatedEvent?.id || null;
    } 
    // Otherwise, create a new event
    else {
      const newEvent = await createCalendarEvent(userId, vacation);
      
      if (newEvent?.id) {
        // Store the Google Calendar event ID
        await supabase
          .from('vacation_bookings')
          .update({
            google_event_id: newEvent.id,
            sync_status: 'synced',
            last_sync_attempt: new Date().toISOString(),
            sync_error: null,
          })
          .eq('id', vacation.id);
      }
      
      return newEvent?.id || null;
    }
  } catch (error) {
    console.error('Failed to sync vacation to calendar:', error);
    
    // Update the sync status with error
    const supabase = createDirectClient();
    await supabase
      .from('vacation_bookings')
      .update({
        sync_status: 'failed',
        last_sync_attempt: new Date().toISOString(),
        sync_error: (error as Error).message,
      })
      .eq('id', vacation.id);
      
    return null;
  }
}

/**
 * Handles the deletion of a Google Calendar event when a vacation is deleted
 * @returns boolean indicating success
 */
export async function handleVacationDeletion(
  userId: string,
  vacationId: string,
  googleEventId?: string | null,
): Promise<boolean> {
  // If no Google event ID, nothing to do
  if (!googleEventId) {
    return true;
  }
  
  try {
    // Delete the event
    return await deleteCalendarEvent(userId, googleEventId);
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

/**
 * Sync all vacation bookings for a user
 * @returns Object with sync statistics
 */
export async function syncAllVacations(userId: string): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  const supabase = createDirectClient();
  
  // Get all vacation bookings that need syncing
  const { data: vacations, error } = await supabase
    .from('vacation_bookings')
    .select('*')
    .eq('user_id', userId)
    .or('google_event_id.is.null,sync_status.eq.failed');
  
  if (error || !vacations) {
    console.error('Error fetching vacations for sync:', error);
    return { total: 0, successful: 0, failed: 0 };
  }
  
  const results = {
    total: vacations.length,
    successful: 0,
    failed: 0,
  };
  
  // Sync each vacation
  for (const vacation of vacations) {
    try {
      const eventId = await syncVacationToCalendar(userId, vacation);
      
      if (eventId) {
        results.successful++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.error(`Failed to sync vacation ${vacation.id}:`, error);
      results.failed++;
    }
  }
  
  return results;
}

/**
 * Update a user's calendar sync preferences
 */
export async function updateCalendarSyncPreference(
  userId: string, 
  enabled: boolean,
): Promise<boolean> {
  const supabase = createDirectClient();
  
  const { error } = await supabase
    .from('users')
    .update({ calendar_sync_enabled: enabled })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating calendar sync preference:', error);
    return false;
  }
  
  return true;
}

/**
 * Updates a vacation booking in Google Calendar
 * @returns boolean indicating success
 */
export async function updateVacationInGoogle(
  userId: string,
  vacation: VacationEventData,
  googleEventId: string,
): Promise<boolean> {
  try {
    // Update the event in Google Calendar
    const updatedEvent = await updateCalendarEvent(
      userId,
      googleEventId,
      vacation,
    );
    
    if (updatedEvent?.id) {
      // Update the sync status in the database
      const supabase = createDirectClient();
      await supabase
        .from('vacation_bookings')
        .update({
          sync_status: 'synced',
          last_sync_attempt: new Date().toISOString(),
          sync_error: null,
        })
        .eq('id', vacation.id);
        
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to update vacation in Google Calendar:', error);
    
    // Update the sync status with error
    const supabase = createDirectClient();
    await supabase
      .from('vacation_bookings')
      .update({
        sync_status: 'failed',
        last_sync_attempt: new Date().toISOString(),
        sync_error: (error as Error).message,
      })
      .eq('id', vacation.id);
      
    return false;
  }
}