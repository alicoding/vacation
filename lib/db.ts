'use client';

/**
 * This file provides functions for client components to fetch data
 * instead of importing Supabase directly which causes errors in client components
 */

// Type for vacation bookings from your schema
export type VacationBooking = {
  id: string;
  startDate: Date;
  endDate: Date;
  note?: string;
  userId: string;
  // Add other fields as needed
};

// Type for holidays from your schema
export type Holiday = {
  id: string;
  date: Date;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
};

// Example function to fetch vacations
export async function fetchVacations(): Promise<VacationBooking[]> {
  const response = await fetch('/api/vacations');
  if (!response.ok) {
    throw new Error('Failed to fetch vacations');
  }
  return response.json();
}

// Example function to fetch holidays
export async function fetchHolidays(): Promise<Holiday[]> {
  const response = await fetch('/api/holidays');
  if (!response.ok) {
    throw new Error('Failed to fetch holidays');
  }
  return response.json();
}

// Add more client-side data fetching functions as needed
