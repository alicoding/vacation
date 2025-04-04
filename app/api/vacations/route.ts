/**
 * Vacation API Route
 *
 * This API route handles vacation booking creation and retrieval.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/utils/supabase-api';
import { createVacationBooking } from '@/services/vacation/vacationService';

export const runtime = 'edge';

// POST handler for creating a vacation booking
export async function POST(req: NextRequest) {
  try {
    const supabase = await createApiClient();

    // Use getUser() for better security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();

    // Validate inputs
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 },
      );
    }

    // Convert string dates to Date objects
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 },
      );
    }

    // Check if start date is before end date
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 },
      );
    }

    // Create the vacation booking
    const booking = await createVacationBooking(
      user.id,
      startDate,
      endDate,
      body.note || null,
      body.isHalfDay || false,
      body.halfDayPortion || null,
    );

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vacation booking:', error);

    // Handle specific error types
    if (error.code === 'OVERLAPPING_BOOKING') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to create vacation booking' },
      { status: 500 },
    );
  }
}

// GET handler for retrieving vacation bookings
export async function GET(req: NextRequest) {
  try {
    const supabase = await createApiClient();

    // Use getUser() for better security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
      // Check if the vacation_bookings table exists
      const { count, error: tableCheckError } = await supabase
        .from('vacation_bookings')
        .select('*', { count: 'exact', head: true });

      if (tableCheckError) {
        if (tableCheckError.code === '42P01') {
          // Table doesn't exist yet, return empty array
          console.warn(
            'vacation_bookings table does not exist yet in Supabase',
          );
          return NextResponse.json([]);
        }
        throw tableCheckError;
      }

      // Get user's vacations
      const { data, error } = await supabase
        .from('vacation_bookings')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      return NextResponse.json(data || []);
    } catch (dbError: any) {
      console.error('Database error fetching vacations:', dbError);
      // Return empty array to prevent frontend from breaking
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching vacations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacations' },
      { status: 500 },
    );
  }
}
