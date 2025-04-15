'use client';

/**
 * Client-side API interface
 * This is the only file that client components should import for data fetching
 */

// Types
export interface VacationBooking {
  id: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  userId: string;
}

export interface Holiday {
  id: string;
  date: Date;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
}

// --- Added Type Definitions ---

// Interface for the common error response structure
interface ApiErrorResponse {
  error: string;
}

// Type guard to check if an object is an ApiErrorResponse
function isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as ApiErrorResponse).error === 'string'
  );
}

// Interface for raw vacation data (dates as strings from API)
interface RawVacationBooking {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
  userId: string;
  // Add any other properties returned by the API if necessary
}

// Interface for raw holiday data (date as string from API)
interface RawHoliday {
  id: string;
  date: string;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
  // Add any other properties returned by the API if necessary
}

// Interface for the sync holidays success response
interface SyncHolidaysResponse {
  success: boolean;
  message: string;
}

// --- API functions for client components ---

export async function fetchVacations(): Promise<VacationBooking[]> {
  const res = await fetch('/api/vacations');
  if (!res.ok) {
    // Basic error handling for fetch failure itself
    throw new Error('Failed to fetch vacations network request failed');
  }
  const data: unknown = await res.json();

  // Type check: Ensure data is an array before mapping
  if (!Array.isArray(data)) {
    console.error('Expected array but received:', data);
    throw new Error('Invalid data format received for vacations');
  }

  // Now map with the assumption it's RawVacationBooking[] (or add more validation if needed)
  return (data as RawVacationBooking[]).map((v) => ({
    ...v,
    startDate: new Date(v.startDate), // Convert string date to Date object
    endDate: new Date(v.endDate), // Convert string date to Date object
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
    credentials: 'include', // <- critical for cookie-based auth
  });

  const responseData: unknown = await res.json(); // Read JSON regardless of status

  if (!res.ok) {
    let errorMessage = 'Failed to create vacation'; // Default message
    if (isApiErrorResponse(responseData)) {
      errorMessage = responseData.error;
    } else if (typeof responseData === 'string') {
      errorMessage = responseData;
    } else {
      // Log unexpected error format
      console.error('Unexpected error format:', responseData);
    }
    throw new Error(errorMessage);
  }

  // Type assertion for successful response
  const vacationData = responseData as RawVacationBooking;

  // Check if the asserted type has the required properties before accessing them
  if (
    typeof vacationData?.startDate !== 'string' ||
    typeof vacationData?.endDate !== 'string'
  ) {
    console.error('Invalid vacation data received:', vacationData);
    throw new Error('Invalid data format received after creating vacation');
  }

  return {
    ...vacationData,
    startDate: new Date(vacationData.startDate), // Convert string date to Date object
    endDate: new Date(vacationData.endDate), // Convert string date to Date object
  };
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const res = await fetch('/api/holidays');
  if (!res.ok) {
    throw new Error('Failed to fetch holidays network request failed');
  }
  const data: unknown = await res.json();

  if (!Array.isArray(data)) {
    console.error('Expected array but received:', data);
    throw new Error('Invalid data format received for holidays');
  }

  return (data as RawHoliday[]).map((h) => {
    // Fix timezone issues by using UTC date construction
    const dateStr = h.date;
    // Basic check for date string format
    if (typeof dateStr !== 'string' || !dateStr.includes('-')) {
      console.error('Invalid date string format in holiday data:', h);
      // Decide how to handle invalid date - skip, throw, return default?
      // For now, let's throw an error or return a modified object
      // throw new Error(`Invalid date format for holiday: ${h.name}`);
      // Or return the object with an invalid date marker if preferred
      return { ...h, date: new Date('Invalid Date') };
    }
    // Parse the ISO string part to extract year, month, day with UTC handling
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);

    // Check if parsing was successful
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Failed to parse date string:', dateStr);
      return { ...h, date: new Date('Invalid Date') };
    }

    // Create a date in UTC to prevent timezone offset
    const fixedDate = new Date(Date.UTC(year, month - 1, day));

    return {
      ...h,
      date: fixedDate, // Use the correctly parsed Date object
    };
  });
}

export async function syncHolidays(
  year: number,
): Promise<SyncHolidaysResponse> {
  // Use the specific response type
  const res = await fetch('/api/holidays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year }),
    credentials: 'include', // <- critical for cookie-based auth
  });

  const responseData: unknown = await res.json(); // Read JSON regardless of status

  if (!res.ok) {
    let errorMessage = 'Failed to sync holidays'; // Default message
    if (isApiErrorResponse(responseData)) {
      errorMessage = responseData.error;
    } else if (typeof responseData === 'string') {
      errorMessage = responseData;
    } else {
      console.error(
        'Unexpected error format during holiday sync:',
        responseData,
      );
    }
    throw new Error(errorMessage);
  }

  // Type assertion for successful response
  // Add validation if the structure isn't guaranteed
  const syncData = responseData as SyncHolidaysResponse;
  if (
    typeof syncData?.success !== 'boolean' ||
    typeof syncData?.message !== 'string'
  ) {
    console.error('Invalid sync response format:', syncData);
    throw new Error('Invalid response format received after syncing holidays');
  }

  return syncData;
}
