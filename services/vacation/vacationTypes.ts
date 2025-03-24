import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Custom error classes for better error handling
export class VacationServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VacationServiceError';
  }
}

export class DatabaseError extends VacationServiceError {
  public readonly code?: string;
  constructor(message: string, prismaError?: PrismaClientKnownRequestError) {
    super(message);
    this.name = 'DatabaseError';
    this.code = prismaError?.code;
  }
}

export class ValidationError extends VacationServiceError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends VacationServiceError {
  constructor(message: string) {
    super(message);
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
};
