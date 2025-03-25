import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
        
    const booking = await prisma.vacationBooking.findUnique({
      where: { id },
    });
    
    if (!booking) {
      return NextResponse.json({ error: 'Vacation booking not found' }, { status: 404 });
    }
    
    if (booking.userId !== session.user.id) {
      return NextResponse.json({ error: 'You can only delete your own vacation bookings' }, { status: 403 });
    }
    
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