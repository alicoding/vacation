import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: 'You must be signed in to update settings' },
      { status: 401 }
    );
  }
  
  try {
    const { total_vacation_days, province } = await request.json();
    
    // Validate input
    if (
      total_vacation_days === undefined ||
      typeof total_vacation_days !== 'number' ||
      total_vacation_days < 0 ||
      total_vacation_days > 365
    ) {
      return NextResponse.json(
        { error: 'Invalid vacation days' },
        { status: 400 }
      );
    }
    
    if (
      !province ||
      typeof province !== 'string' ||
      province.length !== 2
    ) {
      return NextResponse.json(
        { error: 'Invalid province code' },
        { status: 400 }
      );
    }
    
    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        total_vacation_days,
        province,
      },
    });
    
    return NextResponse.json(
      { 
        total_vacation_days: updatedUser.total_vacation_days,
        province: updatedUser.province
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 