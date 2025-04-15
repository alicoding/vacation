import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Use the correct client for Edge routes
import { getGoogleToken, syncVacationToCalendar } from '@/utils/googleCalendar';
// Removed unused Database import
// Define interfaces for request bodies
interface SyncRequestBody {
  enabled: boolean;
}

interface PatchRequestBody {
  vacationId: string;
}

// Assuming VacationEventData is the expected type for the vacation object in syncVacationToCalendar
// If it's not defined elsewhere, it might need to be imported or defined.
// For now, let's assume the structure from vacation_bookings is compatible.
// We might need to import the actual type if available.
// import type { VacationEventData } from '@/types/calendar'; // Example import

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Get the authenticated user using the server client utility
  // console.log( // Changed to console.warn or remove if not needed
  //   `[Sync Route - POST] Request received at ${new Date().toISOString()}`,
  // );
  const supabase = await createSupabaseServerClient(); // Use the async utility
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    // 1. Get raw body
    const rawBody: unknown = await request.json();

    // 2. Perform robust validation
    if (
      typeof rawBody !== 'object' ||
      rawBody === null ||
      !('enabled' in rawBody) ||
      typeof (rawBody as any).enabled !== 'boolean' // Check type carefully
    ) {
      return NextResponse.json(
        { message: 'Invalid request body: enabled must be a boolean' },
        { status: 400 },
      );
    }

    // 3. Assert type *after* validation and extract data
    const body = rawBody as SyncRequestBody;
    const { enabled } = body;

    // Update user's sync preferences (removed 'as any')
    const { error: updateError } = await supabase
      .from('users')
      .update({ calendar_sync_enabled: enabled })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // If calendar sync is being enabled, sync all vacations
    if (enabled) {
      // Verify Google token exists and is valid
      // console.log( // Changed to console.warn or remove
      //   `[Sync Route] Attempting to get Google token for user: ${user.id}`,
      // );
      const token = await getGoogleToken(user.id);
      // console.log( // Changed to console.warn or remove
      //   `[Sync Route] Result of getGoogleToken for user ${user.id}:`,
      //   token ? 'Token found' : 'No token found',
      // );

      if (!token) {
        console.error(
          `[Sync Route] No valid Google token found for user ${user.id}. Returning 400.`,
        );
        return NextResponse.json(
          {
            message:
              'Google Calendar access not authorized. Please reconnect your Google account.',
          },
          { status: 400 },
        );
      }
      // console.log( // Changed to console.warn or remove
      //   `[Sync Route] Valid Google token found for user ${user.id}. Proceeding with sync.`,
      // );

      // Get user's vacation bookings that need to be synced
      // Either they don't have a Google event ID yet or sync failed previously
      const { data: vacations, error: vacationsError } = await supabase
        .from('vacation_bookings')
        .select('*')
        .eq('user_id', user.id) // Removed 'as any', user.id is string
        .or('google_event_id.is.null,sync_status.eq.failed');

      if (vacationsError) {
        throw vacationsError;
      }

      // Track successful and failed syncs
      const results = {
        total: vacations?.length || 0,
        successful: 0,
        failed: 0,
      };

      // Sync each vacation booking to Google Calendar
      if (vacations && vacations.length > 0) {
        for (const vacation of vacations) {
          // Pass supabase client to sync function
          try {
            // Prepare data for sync function, handling potential null 'note'
            const eventData = {
              ...vacation,
              note: vacation.note ?? undefined, // Convert null note to undefined
            };
            const eventId = await syncVacationToCalendar(
              supabase,
              user.id,
              eventData, // Pass the adjusted data
            );

            if (eventId) {
              results.successful++;
            } else {
              results.failed++;
            }
          } catch (error) {
            console.error(
              `Failed to sync vacation ${vacation.id}:`, // Removed 'as any'
              error,
            );
            results.failed++;
          }
        }
      }

      return NextResponse.json(
        {
          message: 'Calendar sync settings updated',
          results,
        },
        { status: 200 },
      );
    }

    // If disabling sync, we don't delete any events, just update the preference
    return NextResponse.json(
      {
        message: 'Calendar sync settings updated',
        enabled: false,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      {
        message: 'Failed to sync calendar',
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

/**
 * Endpoint for manually syncing a specific vacation
 */
export async function PATCH(request: NextRequest) {
  // console.log( // Changed to console.warn or remove
  //   `[Sync Route - PATCH] Request received at ${new Date().toISOString()}`,
  // );
  const supabase = await createSupabaseServerClient(); // Use the async utility
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    // 1. Get raw body
    const rawBody: unknown = await request.json();

    // 2. Perform robust validation
    if (
      typeof rawBody !== 'object' ||
      rawBody === null ||
      !('vacationId' in rawBody) ||
      typeof (rawBody as any).vacationId !== 'string' || // Check type carefully
      !(rawBody as any).vacationId // Check for empty string
    ) {
      return NextResponse.json(
        {
          message:
            'Invalid request body: vacationId must be a non-empty string',
        },
        { status: 400 },
      );
    }

    // 3. Assert type *after* validation and extract data
    const body = rawBody as PatchRequestBody;
    const { vacationId } = body;
    // console.warn(`[Sync Route - PATCH] Processing vacationId: ${vacationId}`); // Use console.warn or remove

    // No need for the !vacationId check here anymore as it's covered above
    // if (!vacationId) {
    // This block seems like leftover code from the previous check removal.
    // It incorrectly returns if the validation *passes*. Removing it.
    // return NextResponse.json(
    //   { message: 'Vacation ID is required' },
    //   { status: 400 },
    // );
    // } // This closing brace prematurely closes the try block. Removing it.

    // Verify Google token exists and is valid
    // The check at line 162 ensures user is not null here.
    const token = await getGoogleToken(user.id);

    if (!token) {
      return NextResponse.json(
        {
          message:
            'Google Calendar access not authorized. Please reconnect your Google account.',
        },
        { status: 400 },
      );
    }

    // Get the specific vacation
    const { data: vacation, error: vacationError } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('id', vacationId) // vacationId should be in scope now
      .eq('user_id', user.id) // Removed 'as any'. user is guaranteed non-null here.
      .single();

    if (vacationError || !vacation) {
      // Added check for !vacation
      return NextResponse.json(
        { message: 'Vacation not found' },
        { status: 404 },
      );
    }

    // Prepare data for sync function, handling potential null 'note'
    const eventData = {
      ...vacation,
      note: vacation.note ?? undefined, // Convert null note to undefined
    };

    // Sync the vacation to Google Calendar (pass supabase client)
    const eventId = await syncVacationToCalendar(
      supabase,
      user.id, // user is guaranteed non-null here.
      eventData, // Pass the adjusted data
    );

    // Check if the sync function indicated success (e.g., returned an eventId)
    // This entire block needs to be inside the try block.
    if (eventId) {
      // Assuming eventId is truthy on success
      // console.log(`[Sync Route - PATCH] Synced vacation ${vacationId}, eventId: ${eventId}`); // Corrected log prefix and changed to warn/remove
      return NextResponse.json(
        {
          message: 'Vacation synced successfully', // Corrected message context
          eventId,
        },
        { status: 200 },
      );
    } else {
      // This case might indicate a non-error failure within syncVacationToCalendar
      console.error(
        `[Sync Route - PATCH] Failed to sync vacation ${vacationId} (no eventId returned)`,
      ); // Corrected log prefix
      return NextResponse.json(
        {
          message: 'Failed to sync vacation to calendar',
        },
        { status: 500 },
      );
    }
    // The try block correctly ends before the catch block now.
  } catch (error) {
    console.error('Manual vacation sync error:', error);
    return NextResponse.json(
      {
        message: 'Failed to sync vacation',
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
