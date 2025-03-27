'use client';

/**
 * Client-side API interface
 * This is the only file that client components should import for data fetching
 */

// Types
export type VacationBooking = {
  id: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  userId: string;
};

export type Holiday = {
  id: string;
  date: Date;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
};

// API functions for client components
export async function fetchVacations(): Promise<VacationBooking[]> {
  const res = await fetch('/api/vacations');
  if (!res.ok) {
    throw new Error('Failed to fetch vacations');
  }
  const data = await res.json();
  return data.map((v: any) => ({
    ...v,
    startDate: new Date(v.startDate),
    endDate: new Date(v.endDate),
  }));
}

export async function createVacation(data: {
  startDate: Date;
  endDate: Date;
  note?: string;
}): Promise<VacationBooking> {
  const res = await fetch('/api/vacations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create vacation');
  }
  
  const vacationData = await res.json();
  return {
    ...vacationData,
    startDate: new Date(vacationData.startDate),
    endDate: new Date(vacationData.endDate),
  };
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const res = await fetch('/api/holidays');
  if (!res.ok) {
    throw new Error('Failed to fetch holidays');
  }
  const data = await res.json();
  return data.map((h: any) => {
    // Fix timezone issues by using UTC date construction
    const dateStr = h.date;
    // Parse the ISO string to extract year, month, day with UTC handling
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    // Create a date in UTC to prevent timezone offset
    const fixedDate = new Date(Date.UTC(year, month - 1, day));
    
    return {
      ...h,
      date: fixedDate,
    };
  });
}

export async function syncHolidays(year: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to sync holidays');
  }
  
  return res.json();
}
