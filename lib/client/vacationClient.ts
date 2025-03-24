/**
 * Client-side functions for vacation-related operations
 */
import type { VacationBookingInput } from '@/services/vacation/vacationTypes';

export async function createVacationBooking(data: VacationBookingInput): Promise<any> {
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
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to create vacation booking: ${errorData.error || response.statusText}`);
  }
  
  return response.json();
}

export async function getVacationBookings(): Promise<any[]> {
  const response = await fetch('/api/vacations');
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to fetch vacation bookings: ${errorData.error || response.statusText}`);
  }
  
  const bookings = await response.json();
  return bookings.map((booking: any) => ({
    ...booking,
    startDate: new Date(booking.start_date),
    endDate: new Date(booking.end_date),
    createdAt: booking.created_at ? new Date(booking.created_at) : undefined
  }));
}
