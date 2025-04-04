export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createDirectClient } from '@/lib/supabase.server';
import { handleVacationDeletion, updateVacationInGoogle } from '@/utils/googleCalendar';
import { createServerClient } from '@supabase/ssr';

// Helper function to create authenticated Supabase client
const createAuthenticatedClient = (cookieHeader: string) => {
  // Parse cookies into a reliable format for Supabase auth
  const cookieStore = {
    get: (name: string) => {
      const cookies = cookieHeader.split(';').map((c) => c.trim());
      const cookie = cookies.find((c) => c.startsWith(`${name}=`));
      if (cookie) {
        return cookie.split('=')[1];
      }
      return undefined;
    },
    set: () => {},
    remove: () => {},
  };
  
  // Create a server client using the parsed cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: cookieStore,
    },
  );
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  
  // Create a more reliable server client with request cookies
  const cookieHeader = request.headers.get('cookie') || '';
  console.log('DELETE request for vacation:', id, 'Cookie header length:', cookieHeader.length);
  
  const supabase = createAuthenticatedClient(cookieHeader);
  
  // Get the user with the more reliable client
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Authentication error in vacation DELETE:', authError?.message || 'No user found');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Log successful authentication
  console.log('User authenticated in DELETE endpoint:', user.email);
  
  try {
    // Check if vacation belongs to the user
    const { data: vacation, error: fetchError } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !vacation) {
      return NextResponse.json(
        { error: 'Vacation booking not found or not authorized' },
        { status: 404 },
      );
    }
    
    // If the vacation has a Google Calendar event, delete it before removing the vacation
    let calendarDeleteSuccess = true;
    if (vacation.google_event_id) {
      try {
        calendarDeleteSuccess = await handleVacationDeletion(
          user.id,
          vacation.id,
          vacation.google_event_id,
        );
      } catch (error) {
        console.error('Error deleting Google Calendar event:', error);
        calendarDeleteSuccess = false;
      }
    }
    
    // Delete the vacation booking
    const { error: deleteError } = await supabase
      .from('vacation_bookings')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return NextResponse.json({ 
      message: 'Vacation booking deleted successfully',
      calendarSync: vacation.google_event_id 
        ? (calendarDeleteSuccess 
          ? 'Calendar event deleted successfully' 
          : 'Calendar event deletion failed, but vacation was removed')
        : 'No calendar event to delete',
    });
  } catch (error) {
    console.error('Error deleting vacation booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete vacation booking' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  
  // Create authenticated client with request cookies
  const cookieHeader = request.headers.get('cookie') || '';
  console.log('PATCH request for vacation:', id, 'Cookie header length:', cookieHeader.length);
  
  const supabase = createAuthenticatedClient(cookieHeader);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('Authentication error in vacation PATCH:', authError?.message || 'No user found');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  // Log successful authentication
  console.log('User authenticated in PATCH endpoint:', user.email);
  
  try {
    // Parse the request body
    const updateData = await request.json();
    
    // Validate required fields
    if (!updateData.start_date || !updateData.end_date) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 },
      );
    }
    
    // Check if vacation belongs to the user
    const { data: vacation, error: fetchError } = await supabase
      .from('vacation_bookings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !vacation) {
      return NextResponse.json(
        { error: 'Vacation booking not found or not authorized' },
        { status: 404 },
      );
    }
    
    // Update the vacation booking - removed updated_at field that was causing the error
    const { data: updatedVacation, error: updateError } = await supabase
      .from('vacation_bookings')
      .update({
        start_date: updateData.start_date,
        end_date: updateData.end_date,
        note: updateData.note,
        is_half_day: updateData.is_half_day || false,
        half_day_portion: updateData.half_day_portion || null,
      })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) {
      throw updateError;
    }
    
    // If the vacation has a Google Calendar event, update it
    let calendarUpdateSuccess = true;
    if (vacation.google_event_id) {
      try {
        calendarUpdateSuccess = await updateVacationInGoogle(
          user.id,
          updatedVacation,
          vacation.google_event_id,
        );
      } catch (error) {
        console.error('Error updating Google Calendar event:', error);
        calendarUpdateSuccess = false;
      }
    }
    
    return NextResponse.json({
      message: 'Vacation booking updated successfully',
      vacation: updatedVacation,
      calendarSync: vacation.google_event_id
        ? (calendarUpdateSuccess
          ? 'Calendar event updated successfully'
          : 'Calendar event update failed, but vacation was updated')
        : 'No calendar event to update',
    });
  } catch (error) {
    console.error('Error updating vacation booking:', error);
    return NextResponse.json(
      { error: 'Failed to update vacation booking' },
      { status: 500 },
    );
  }
}