// Custom error classes for better error handling
export class VacationServiceError extends Error {
  code: string;

  constructor(message: string, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'VacationServiceError';
    this.code = code;
  }
}

export class DatabaseError extends VacationServiceError {
  constructor(message: string, originalError?: any) {
    super(message, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
    this.cause = originalError;
  }
}

export interface VacationUpdateInput {
  start_date: string;
  end_date: string;
  note?: string;
  is_half_day?: boolean;
  half_day_portion?: 'AM' | 'PM' | null;
}

export class ValidationError extends VacationServiceError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends VacationServiceError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Database schema type that matches the actual Supabase table structure
 * Uses snake_case to match PostgreSQL column naming convention
 */
export interface VacationBookingDb {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  note?: string | null;
  created_at?: string;
  is_half_day?: boolean;
  half_day_portion?: string | null;
  google_event_id?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
  last_sync_attempt?: string | null;
}

export interface VacationBooking {
  id?: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  note?: string | null;
  createdAt?: Date;
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
}

export interface VacationWithDetails extends VacationBooking {
  isLongWeekend: boolean;
  adjacentHolidays: string[];
  totalDaysOff: number;
  workingDaysOff: number;
}

export interface VacationBookingInput {
  userId: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
  halfDayDate?: Date | null;
  halfDayDates?: {
    date: Date;
    portion: string;
  }[];
}
