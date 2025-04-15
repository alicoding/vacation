/**
 * Client-side functions for vacation-related operations
 */
import type { VacationBookingInput } from '@/services/vacation/vacationTypes';

export async function createVacationBooking(
  data: VacationBookingInput,
): Promise<any> {
  if (!data.userId || !data.startDate || !data.endDate) {
    throw new Error('User ID, start date, and end date are required');
  }

  const response = await fetch('/api/vacations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({
      error: response.statusText,
    }));

    const errorMessage =
      typeof errorData === 'object' &&
      errorData !== null &&
      'error' in errorData &&
      typeof (errorData as any).error === 'string'
        ? (errorData as any).error
        : response.statusText;

    // If it's a 400 status, it's likely a validation error (e.g. overlapping bookings)
    if (response.status === 400) {
      throw new Error(errorMessage);
    }

    throw new Error(`Failed to create vacation booking: ${errorMessage}`);
  }

  return response.json();
}

import type { VacationBooking } from '@/types';

export async function getVacationBookings(): Promise<VacationBooking[]> {
  const response = await fetch('/api/vacations');

  if (!response.ok) {
    const errorData: unknown = await response
      .json()
      .catch(() => ({ error: response.statusText }));

    const errorMessage =
      typeof errorData === 'object' &&
      errorData !== null &&
      'error' in errorData &&
      typeof (errorData as any).error === 'string'
        ? (errorData as any).error
        : response.statusText;

    throw new Error(`Failed to fetch vacation bookings: ${errorMessage}`);
  }

  const rawData: unknown = await response.json();

  if (!Array.isArray(rawData)) {
    throw new Error('Invalid vacation bookings data format');
  }

  return rawData.map((booking: any) => {
    if (
      typeof booking !== 'object' ||
      booking === null ||
      typeof booking.id !== 'string' ||
      typeof booking.start_date !== 'string' ||
      typeof booking.end_date !== 'string' ||
      typeof booking.user_id !== 'string'
    ) {
      throw new Error('Invalid booking entry structure');
    }

    return {
      ...booking,
      start_date: booking.start_date,
      end_date: booking.end_date,
      created_at: booking.created_at,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      createdAt: booking.created_at ? new Date(booking.created_at) : undefined,
    } as VacationBooking;
  });
}
