import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createVacationBooking } from '@/services/vacation/vacationService';
import { prisma } from '@/lib/prisma'; // This is safe in API routes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }
    
    if (!data.startDate) {
      return NextResponse.json(
        { error: 'Missing start date' },
        { status: 400 }
      );
    }
    
    if (!data.endDate) {
      return NextResponse.json(
        { error: 'Missing end date' },
        { status: 400 }
      );
    }
    
    // Ensure the user is only booking for themselves
    if (data.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only book vacations for yourself' },
        { status: 403 }
      );
    }

    const booking = await createVacationBooking({
      userId: data.userId,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      note: data.note || null,
      isHalfDay: data.is_half_day || false,
      halfDayPortion: data.half_day_portion || null,
    });
    
    // Format dates as ISO strings for consistent client/server rendering
    const formattedBooking = {
      ...booking,
      start_date: booking.start_date.toISOString(),
      end_date: booking.end_date.toISOString(),
      created_at: booking.created_at.toISOString(),
      // Add client-expected format
      startDate: booking.start_date.toISOString(),
      endDate: booking.end_date.toISOString(),
      createdAt: booking.created_at.toISOString(),
    };
    
    return NextResponse.json(formattedBooking);
  } catch (error) {
    console.error('Error creating vacation booking:', error);
    return NextResponse.json(
      { error: 'Failed to create vacation booking', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    
    // Users can only see their own vacations
    const whereCondition = { userId };

    const vacations = await prisma.vacationBooking.findMany({
      where: whereCondition,
      orderBy: { start_date: 'asc' },
    });

    // Transform data to match client expectations with consistent date formats
    const formattedVacations = vacations.map((booking) => ({
      ...booking,
      start_date: booking.start_date.toISOString(),
      end_date: booking.end_date.toISOString(),
      created_at: booking.created_at.toISOString(),
      // Add client-expected format
      startDate: booking.start_date.toISOString(),
      endDate: booking.end_date.toISOString(),
      createdAt: booking.created_at.toISOString(),
    }));

    return NextResponse.json(formattedVacations);
  } catch (error) {
    console.error('Error fetching vacations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vacations', details: String(error) },
      { status: 500 }
    );
  }
}