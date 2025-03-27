export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/utils/supabase';

// DELETE handler for deleting a vacation booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Get the session directly from Supabase
  const supabase = createDirectClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;
  
  try {
    // Check if vacation belongs to the user
    const { data: vacation, error: fetchError } = await supabase
      .from('vacations')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();
    
    if (fetchError || !vacation) {
      return NextResponse.json(
        { error: 'Vacation booking not found or not authorized' },
        { status: 404 }
      );
    }
    
    // Delete the vacation booking
    const { error: deleteError } = await supabase
      .from('vacations')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // If the vacation had a Google Calendar event, delete it
    if (vacation.google_event_id) {
      // Fetch the user's Google token
      const { data: tokenData } = await supabase
        .from('google_tokens')
        .select('access_token')
        .eq('user_id', session.user.id)
        .single();
      
      if (tokenData?.access_token) {
        // Delete the Google Calendar event
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${vacation.google_event_id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          }
        );
      }
    }
    
    return NextResponse.json({ message: 'Vacation booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting vacation booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete vacation booking' },
      { status: 500 }
    );
  }
}