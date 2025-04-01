import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase';
import { getGoogleToken, syncVacationToCalendar } from '@/utils/googleCalendar';
import type { Database } from '@/types/supabase';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  // Get the authenticated user using getUser() for better security
  const supabase = createDirectClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { enabled } = body;
    
    // Update user's sync preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ calendar_sync_enabled: enabled } as any)
      .eq('id', user.id as any);
      
    if (updateError) {
      throw updateError;
    }
    
    // If calendar sync is being enabled, sync all vacations
    if (enabled) {
      // Verify Google token exists and is valid
      const token = await getGoogleToken(user.id);
      
      if (!token) {
        return NextResponse.json(
          { message: 'Google Calendar access not authorized. Please reconnect your Google account.' }, 
          { status: 400 },
        );
      }
      
      // Get user's vacation bookings that need to be synced
      // Either they don't have a Google event ID yet or sync failed previously
      const { data: vacations, error: vacationsError } = await supabase
        .from('vacation_bookings')
        .select('*')
        .eq('user_id', user.id as any)
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
          try {
            const eventId = await syncVacationToCalendar(user.id, vacation as any);
            
            if (eventId) {
              results.successful++;
            } else {
              results.failed++;
            }
          } catch (error) {
            console.error(`Failed to sync vacation ${(vacation as any).id}:`, error);
            results.failed++;
          }
        }
      }
      
      return NextResponse.json({ 
        message: 'Calendar sync settings updated',
        results,
      }, { status: 200 });
    }
    
    // If disabling sync, we don't delete any events, just update the preference
    return NextResponse.json({ 
      message: 'Calendar sync settings updated',
      enabled: false,
    }, { status: 200 });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ 
      message: 'Failed to sync calendar',
      error: (error as Error).message, 
    }, { status: 500 });
  }
}

/**
 * Endpoint for manually syncing a specific vacation
 */
export async function PATCH(request: NextRequest) {
  const supabase = createDirectClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { vacationId } = body;
    
    if (!vacationId) {
      return NextResponse.json({ message: 'Vacation ID is required' }, { status: 400 });
    }
    
    // Verify Google token exists and is valid
    const token = await getGoogleToken(user.id);
    
    if (!token) {
      return NextResponse.json(
        { message: 'Google Calendar access not authorized. Please reconnect your Google account.' }, 
        { status: 400 },
      );
    }
    
    // Get the specific vacation
    const { data: vacation, error: vacationError } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('id', vacationId)
      .eq('user_id', user.id as any)
      .single();
      
    if (vacationError) {
      return NextResponse.json({ message: 'Vacation not found' }, { status: 404 });
    }
    
    // Sync the vacation to Google Calendar
    const eventId = await syncVacationToCalendar(user.id, vacation as any);
    
    if (eventId) {
      return NextResponse.json({ 
        message: 'Vacation synced successfully',
        eventId,
      }, { status: 200 });
    } else {
      return NextResponse.json({ 
        message: 'Failed to sync vacation',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Manual vacation sync error:', error);
    return NextResponse.json({ 
      message: 'Failed to sync vacation',
      error: (error as Error).message, 
    }, { status: 500 });
  }
}
