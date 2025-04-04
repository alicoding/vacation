export const runtime = 'edge';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  description?: string;
  type: 'bank' | 'provincial';
  province?: string;
}

export interface VacationBooking {
  id: string;
  start_date: string | Date;
  end_date: string | Date;
  note?: string | null;
  created_at: string | Date;
  userId: string;
  startDate?: Date; // For type compatibility with vacationTypes.ts
  endDate?: Date; // For type compatibility with vacationTypes.ts
  createdAt?: Date; // For type compatibility with vacationTypes.ts
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
  week_starts_on?: string;
}
