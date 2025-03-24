'use server';

import { prisma } from '@/lib/prisma';
import { isHoliday } from '@/services/holiday/holidayService';
import { isWeekend } from '@/lib/client/holidayClient';
import { DateTime, Interval } from 'luxon';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  VacationServiceError,
  DatabaseError,
  ValidationError,
  NotFoundError,
  VacationBookingInput,
  VacationBooking,
  VacationWithDetails
} from './vacationTypes';

/**
 * Server-only service for handling vacation operations
 */
export async function createVacationBooking(data: VacationBookingInput) {
  try {
    return await prisma.vacationBooking.create({
      data: {
        userId: data.userId,
        start_date: data.startDate,
        end_date: data.endDate,
        note: data.note,
      },
    });
  } catch (error) {
    console.error('Error creating vacation booking:', error);
    throw new DatabaseError(`Failed to create vacation booking: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getVacationBookings(userId: string) {
  return prisma.vacationBooking.findMany({
    where: { userId },
    orderBy: { start_date: 'asc' },
  });
}

export async function deleteVacationBooking(id: string, userId: string) {
  return prisma.vacationBooking.deleteMany({
    where: {
      id,
      userId, // For security, only allow deleting own bookings
    },
  });
}

/**
 * Get upcoming vacation bookings for a user with additional details
 */
export async function getUpcomingVacations(
  userId: string,
  province: string,
  limit: number = 5
): Promise<VacationWithDetails[]> {
  try {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    if (!province) {
      throw new ValidationError('Province is required');
    }
    const bookings = await prisma.vacationBooking.findMany({
      where: {
        userId,
        start_date: {
          gte: new Date(),
        },
      },
      orderBy: {
        start_date: 'asc',
      },
      take: limit,
    });

    const vacationsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const startDate = booking.start_date;
        const endDate = booking.end_date;
        
        // Convert to Luxon DateTime for easier handling
        const startDateTime = DateTime.fromJSDate(startDate);
        const endDateTime = DateTime.fromJSDate(endDate);
        
        // Get all days in the range
        const interval = Interval.fromDateTimes(startDateTime, endDateTime.plus({ days: 1 }));
        const days = Array.from(interval.splitBy({ days: 1 })).map(i => i.start!);
        
        // Count working days (excluding weekends and holidays)
        let workingDaysOff = 0;
        const adjacentHolidays: string[] = [];
        
        for (const day of days) {
          const jsDay = day.toJSDate();
          if (!isWeekend(jsDay)) {
            const holidayInfo = await isHoliday(jsDay, province);
            if (holidayInfo.isHoliday) {
              adjacentHolidays.push(holidayInfo.name || 'Holiday');
            } else {
              workingDaysOff++;
            }
          }
        }
        
        // Calculate total days off
        const totalDaysOff = days.length;
        
        // Check if this is a long weekend (1-2 days connected to a weekend)
        const dayBefore = startDateTime.minus({ days: 1 }).toJSDate();
        const dayAfter = endDateTime.plus({ days: 1 }).toJSDate();
        const isLongWeekend =
          totalDaysOff <= 2 &&
          (isWeekend(dayBefore) || isWeekend(dayAfter));
        
        return {
          id: booking.id,
          userId: booking.userId,
          startDate: booking.start_date,
          endDate: booking.end_date,
          note: booking.note,
          createdAt: booking.created_at,
          isLongWeekend,
          adjacentHolidays,
          totalDaysOff,
          workingDaysOff,
        };
      })
    );
    return vacationsWithDetails;
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
      throw new DatabaseError(`Database error while fetching upcoming vacations: ${error.message}`, error);
    } else if (error instanceof VacationServiceError) {
      throw error;
    } else {
      throw new VacationServiceError(`Failed to get upcoming vacations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Update a vacation booking
 */
export async function updateVacationBooking(
  id: string,
  booking: Partial<VacationBooking>
): Promise<VacationBooking> {
  try {
    if (!id) {
      throw new ValidationError('Vacation booking ID is required');
    }
    // Check if booking exists
    const existingBooking = await prisma.vacationBooking.findUnique({
      where: { id },
    });
    if (!existingBooking) {
      throw new NotFoundError(`Vacation booking with ID ${id} not found`);
    }
    // Validate dates if provided
    if (booking.startDate && booking.endDate && booking.startDate > booking.endDate) {
      throw new ValidationError('Start date must be before end date');
    }
    const updatedBooking = await prisma.vacationBooking.update({
      where: { id },
      data: {
        // Prisma v6: Column names should match schema exactly
        start_date: booking.startDate,
        end_date: booking.endDate,
        note: booking.note,
      },
    });

    return {
      id: updatedBooking.id,
      userId: updatedBooking.userId,
      startDate: updatedBooking.start_date,
      endDate: updatedBooking.end_date,
      note: updatedBooking.note,
      createdAt: updatedBooking.created_at,
    };
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new NotFoundError(`Vacation booking with ID ${id} not found`);
      }
      throw new DatabaseError(`Database error while updating booking: ${error.message}`, error);
    } else if (error instanceof VacationServiceError) {
      throw error;
    } else {
      throw new VacationServiceError(`Failed to update vacation booking: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Get vacation balance for a user
 */
export async function getVacationBalance(userId: string, province: string): Promise<{
  total: number;
  used: number;
  remaining: number;
}> {
  try {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Get user's total vacation days
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { total_vacation_days: true },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }
    const totalDays = user.total_vacation_days || 0;

    // Get all vacations for the current year
    const currentYear = DateTime.now().year;
    const startOfYear = DateTime.local(currentYear, 1, 1).startOf('day').toJSDate();
    const endOfYear = DateTime.local(currentYear, 12, 31).endOf('day').toJSDate();

    const vacations = await prisma.vacationBooking.findMany({
      where: {
        userId,
        start_date: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });

    // Calculate used days (excluding weekends and holidays)
    let usedDays = 0;

    for (const vacation of vacations) {
      const startDateTime = DateTime.fromJSDate(vacation.start_date);
      const endDateTime = DateTime.fromJSDate(vacation.end_date);
      
      const interval = Interval.fromDateTimes(startDateTime, endDateTime.plus({ days: 1 }));
      const days = Array.from(interval.splitBy({ days: 1 })).map(i => i.start!);
      
      for (const day of days) {
        const jsDay = day.toJSDate();
        if (!isWeekend(jsDay)) {
          const holidayInfo = await isHoliday(jsDay, province);
          if (!holidayInfo.isHoliday) {
            usedDays++;
          }
        }
      }
    }

    // Calculate remaining days
    const remainingDays = Math.max(0, totalDays - usedDays);
    return {
      total: totalDays,
      used: usedDays,
      remaining: remainingDays,
    };
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError) {
      throw new DatabaseError(`Database error while calculating vacation balance: ${error.message}`, error);
    } else if (error instanceof VacationServiceError) {
      throw error;
    } else {
      throw new VacationServiceError(`Failed to get vacation balance: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
