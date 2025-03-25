export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'federal' | 'provincial' | 'bank';
  province?: string | null;
}

export interface VacationBooking {
  id: string;
  start_date: string | Date;
  end_date: string | Date;
  note?: string | null;
  created_at: string | Date;
  userId: string;
  startDate?: Date;  // For type compatibility with vacationTypes.ts
  endDate?: Date;    // For type compatibility with vacationTypes.ts
  createdAt?: Date;  // For type compatibility with vacationTypes.ts
  is_half_day?: boolean;
  half_day_portion?: 'AM' | 'PM' | null;
}

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  total_vacation_days?: number;
  province?: string;
  employment_type?: string;
}

// Re-export types from next-auth.d.ts for convenience
export * from 'next-auth';