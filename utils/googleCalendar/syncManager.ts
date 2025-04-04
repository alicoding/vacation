// Remove client import: import { createSupabaseClient } from '@/lib/supabase.client';
import { SupabaseClient } from '@supabase/supabase-js'; // Import the type
import type { Database } from '@/types/supabase'; // Import Database type if not already present
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  findCalendarEventByVacationId,
} from './eventManager'; // Import find function
import { VacationEventData } from './types';

/**
 * Sync a single vacation booking to Google Calendar
 * Creates, updates, or skips based on existing event ID and sync status
 * @returns The Google Calendar event ID if successful, null otherwise
 */
export async function syncVacationToCalendar(
  supabase: SupabaseClient<Database>,
  userId: string,
  vacation: VacationEventData,
): Promise<string | null> {
  // Define logPrefix here so it's available in catch block too
  const logPrefix = `[syncVacationToCalendar User: ${userId} Vacation: ${vacation.id}]`;

  try {
    console.log(
      `${logPrefix} Starting sync. Current google_event_id: ${vacation.google_event_id}`,
    );
    let finalEventId: string | null | undefined = null; // Renamed to avoid confusion in scope

    // 1. Try to find an existing event using the vacation ID stored in extended properties
    const foundEventId = await findCalendarEventByVacationId(
      userId,
      vacation.id,
    );

    if (foundEventId) {
      // 2a. Event found via extended properties - this is the source of truth
      finalEventId = foundEventId;
      console.log(
        `${logPrefix} Found existing event via extended property: ${finalEventId}`,
      );

      // Ensure local DB has the correct ID
      if (vacation.google_event_id !== finalEventId) {
        console.log(
          `${logPrefix} Local google_event_id (${vacation.google_event_id}) differs from found ID. Updating local record.`,
        );
        await supabase
          .from('vacation_bookings')
          .update({
            google_event_id: finalEventId,
            // Don't set sync_status here yet, wait for update attempt
          } as any) // Type assertion needed for Supabase parameter compatibility
          .eq('id', vacation.id as any); // Type assertion needed for Supabase parameter compatibility
        // Update the local vacation object in memory for consistency? Optional.
        vacation.google_event_id = finalEventId;
      }

      // Update the event in Google Calendar to ensure details are current
      console.log(
        `${logPrefix} Attempting to update details for found event ID ${finalEventId}`,
      );
      const updatedEvent = await updateCalendarEvent(
        userId,
        finalEventId,
        vacation,
      );
      if (!updatedEvent?.id) {
        console.warn(
          `${logPrefix} Update call for found event ${finalEventId} failed or returned no ID.`,
        );
        // Decide how to handle - maybe nullify finalEventId to trigger error below?
        // For now, we keep finalEventId, assuming the event might still exist but update failed.
      } else {
        console.log(
          `${logPrefix} Update successful for found event ID ${finalEventId}`,
        );
      }
    } else {
      // 2b. No event found via extended properties - need to create one
      console.log(
        `${logPrefix} No existing event found via extended property.`,
      );
      if (vacation.google_event_id) {
        console.warn(
          `${logPrefix} Local record has google_event_id ${vacation.google_event_id}, but no matching event found in Google. Treating as orphaned.`,
        );
        // Optionally clear the local google_event_id here?
      }

      console.log(`${logPrefix} Attempting to create new event.`);
      const newEvent = await createCalendarEvent(userId, vacation); // createCalendarEvent now adds extended prop
      finalEventId = newEvent?.id;
      console.log(
        `${logPrefix} Create event attempt finished. Result ID: ${finalEventId}`,
      );

      if (finalEventId) {
        // Store the new Google Calendar event ID
        console.log(
          `${logPrefix} Storing new event ID ${finalEventId} in database.`,
        );
        await supabase
          .from('vacation_bookings')
          .update({ google_event_id: finalEventId } as any)
          .eq('id', vacation.id as any);
      }
    }

    // Common logic for updating sync status after successful create/update
    if (finalEventId) {
      console.log(
        `${logPrefix} Sync successful. Updating status for event ID: ${finalEventId}`,
      );
      await supabase
        .from('vacation_bookings')
        .update({
          // Update status for BOTH create and update success
          sync_status: 'synced',
          last_sync_attempt: new Date().toISOString(), // Ensure this is updated on successful update too
          sync_error: null,
        } as any) // Type assertion needed for Supabase parameter compatibility
        .eq('id', vacation.id as any); // Type assertion needed for Supabase parameter compatibility

      return finalEventId;
    } else {
      // Handle case where create/update didn't return an ID (might indicate failure)
      console.log(
        `${logPrefix} Event creation/update process failed to yield a final event ID. Assuming failure.`,
      );
      throw new Error(
        'Calendar event creation or update did not return an ID.',
      ); // Trigger catch block
    }
  } catch (error) {
    console.error(`${logPrefix} Failed to sync vacation to calendar:`, error);
    // Update the sync status with error
    // Remove internal client creation: const supabase = createSupabaseClient();
    // Use the passed-in client
    await supabase
      .from('vacation_bookings')
      .update({
        sync_status: 'failed',
        last_sync_attempt: new Date().toISOString(),
        sync_error: (error as Error).message,
      } as any) // Type assertion needed for Supabase parameter compatibility
      .eq('id', vacation.id as any); // Type assertion needed for Supabase parameter compatibility
    console.log(`${logPrefix} Updated sync status to 'failed' in database.`);

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
  // googleEventId is no longer strictly needed here, but kept for potential logging/context
  googleEventId?: string | null,
): Promise<boolean> {
  const logPrefix = `[handleVacationDeletion User: ${userId} Vacation: ${vacationId}]`;
  console.log(
    `${logPrefix} Initiating deletion process. Provided googleEventId: ${googleEventId}`,
  );

  try {
    // 1. Find the event using the reliable vacationId extended property
    console.log(`${logPrefix} Searching for Google event using vacationId.`);
    const eventIdToDelele = await findCalendarEventByVacationId(
      userId,
      vacationId,
    );

    if (!eventIdToDelele) {
      console.log(
        `${logPrefix} No corresponding Google event found for vacationId. Nothing to delete.`,
      );
      // If the DB had an ID but we didn't find it, it might be orphaned, but deletion is "successful" from app perspective.
      return true;
    }

    // 2. Delete the found event
    console.log(
      `${logPrefix} Found event ${eventIdToDelele}. Attempting deletion.`,
    );
    const deleted = await deleteCalendarEvent(userId, eventIdToDelele);

    if (deleted) {
      console.log(
        `${logPrefix} Successfully deleted event ${eventIdToDelele}.`,
      );
    } else {
      // deleteCalendarEvent should throw on actual API errors other than 404
      console.warn(
        `${logPrefix} Deletion call for event ${eventIdToDelele} returned false, but no error was thrown.`,
      );
    }
    return deleted; // deleteCalendarEvent returns true on success or 404
  } catch (error) {
    console.error(
      `${logPrefix} Failed to find or delete calendar event:`,
      error,
    );
    return false; // Indicate failure
  }
}

/**
 * Sync all vacation bookings for a user
 * @returns Object with sync statistics
 */
export async function syncAllVacations(
  supabase: SupabaseClient<Database>, // Add supabase client parameter
  userId: string,
): Promise<{
  total: number;
  successful: number;
  failed: number;
}> {
  // Remove internal client creation: const supabase = createSupabaseClient();

  // Get all vacation bookings that need syncing
  const { data: vacations, error } = await supabase
    .from('vacation_bookings')
    .select('*')
    .eq('user_id', userId as any) // Type assertion needed for Supabase parameter compatibility
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

  // Filter out any invalid items and process each valid vacation
  for (const vacation of vacations) {
    if (
      !vacation ||
      !('id' in vacation) ||
      !('start_date' in vacation) ||
      !('end_date' in vacation)
    ) {
      console.error('Invalid vacation data:', vacation);
      results.failed++;
      continue;
    }

    try {
      // Pass the supabase client down
      const eventId = await syncVacationToCalendar(
        supabase,
        userId,
        vacation as VacationEventData,
      );

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
  supabase: SupabaseClient<Database>, // Add supabase client parameter
  userId: string,
  enabled: boolean,
): Promise<boolean> {
  // Remove internal client creation: const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('users')
    .update({ calendar_sync_enabled: enabled } as any) // Type assertion needed for Supabase parameter compatibility
    .eq('id', userId as any); // Type assertion needed for Supabase parameter compatibility

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
  supabase: SupabaseClient<Database>, // Add supabase client parameter
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
      // Remove internal client creation: const supabase = createSupabaseClient();
      // Use the passed-in client
      await supabase
        .from('vacation_bookings')
        .update({
          sync_status: 'synced',
          last_sync_attempt: new Date().toISOString(),
          sync_error: null,
        } as any) // Type assertion needed for Supabase parameter compatibility
        .eq('id', vacation.id as any); // Type assertion needed for Supabase parameter compatibility

      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to update vacation in Google Calendar:', error);

    // Update the sync status with error
    // Remove internal client creation: const supabase = createSupabaseClient();
    // Use the passed-in client
    await supabase
      .from('vacation_bookings')
      .update({
        sync_status: 'failed',
        last_sync_attempt: new Date().toISOString(),
        sync_error: (error as Error).message,
      } as any) // Type assertion needed for Supabase parameter compatibility
      .eq('id', vacation.id as any); // Type assertion needed for Supabase parameter compatibility

    return false;
  }
}
