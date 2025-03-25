import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
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
    const { total_vacation_days, province, employment_type, week_starts_on } = await request.json();
    
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
    
    if (
      !employment_type ||
      typeof employment_type !== 'string' ||
      !['standard', 'bank', 'federal'].includes(employment_type)
    ) {
      return NextResponse.json(
        { error: 'Invalid employment type' },
        { status: 400 }
      );
    }
    
    if (
      !week_starts_on ||
      typeof week_starts_on !== 'string' ||
      !['sunday', 'monday'].includes(week_starts_on)
    ) {
      return NextResponse.json(
        { error: 'Invalid week start day' },
        { status: 400 }
      );
    }
    
    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        total_vacation_days,
        province,
        employment_type,
        week_starts_on,
      },
    });
    
    return NextResponse.json(
      { 
        total_vacation_days: updatedUser.total_vacation_days,
        province: updatedUser.province,
        employment_type: updatedUser.employment_type,
        week_starts_on: updatedUser.week_starts_on
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