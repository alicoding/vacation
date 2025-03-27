export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase';
import { GoogleCalendarService } from '@/lib/services/googleCalendar';

export async function POST(request: NextRequest) {
  // Get the session directly from Supabase
  const supabase = createDirectClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled } = body;

    // Get the user's Google OAuth2 tokens
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('provider', 'google')
      .eq('user_email', session.user.email)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ message: 'Google account not connected' }, { status: 400 });
    }

    // Update user's sync preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ calendar_sync_enabled: enabled })
      .eq('email', session.user.email);

    if (updateError) {
      throw updateError;
    }

    if (enabled) {
      // Initialize Google Calendar service with the user's access token
      const googleCalendar = new GoogleCalendarService(account.access_token);

      // Get user's vacation bookings that don't have a Google Calendar event yet
      const { data: vacations, error: vacationsError } = await supabase
        .from('vacation_bookings')
        .select('*')
        .eq('user_email', session.user.email)
        .is('google_event_id', null);

      if (vacationsError) {
        throw vacationsError;
      }

      // Sync each vacation booking to Google Calendar
      for (const vacation of vacations || []) {
        const eventData = {
          summary: 'Vacation',
          description: vacation.note || 'Vacation day',
          start: {
            date: new Date(vacation.start_date).toISOString().split('T')[0],
            timeZone: 'UTC',
          },
          end: {
            date: new Date(vacation.end_date).toISOString().split('T')[0],
            timeZone: 'UTC',
          },
        };

        const event = await googleCalendar.insertEvent('primary', eventData);

        // Store the Google Calendar event ID
        if (event.id) {
          const { error: updateEventError } = await supabase
            .from('vacation_bookings')
            .update({ google_event_id: event.id })
            .eq('id', vacation.id);
            
          if (updateEventError) {
            console.error('Failed to update vacation with Google event ID:', updateEventError);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Calendar sync settings updated' }, { status: 200 });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ message: 'Failed to sync calendar' }, { status: 500 });
  }
}
