// Custom error classes for better error handling
export class VacationServiceError extends Error {
  code: string;
  
  constructor(message: string, code: string = 'UNKNOWN_ERROR') {
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

export type VacationBookingInput = {
  userId: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
  halfDayDate?: Date | null;
  halfDayDates?: Array<{
    date: Date;
    portion: string;
  }>;
};
