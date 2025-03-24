import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const id = params.id;
    
    // First check if the booking exists and belongs to the user
    const booking = await prisma.vacationBooking.findUnique({
      where: { id },
    });
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Vacation booking not found' },
        { status: 404 }
      );
    }
    
    // Ensure users can only delete their own bookings
    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own vacation bookings' },
        { status: 403 }
      );
    }
    
    // Delete the booking
    await prisma.vacationBooking.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vacation booking:', error);
    return NextResponse.json(
      { error: 'Failed to delete vacation booking', details: String(error) },
      { status: 500 }
    );
  }
}