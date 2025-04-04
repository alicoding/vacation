'use server';

// Import and re-export async functions explicitly
import {
  createVacationBooking,
  updateVacationBooking,
  deleteVacationBooking,
} from './vacationBookingService';

import { calculateBusinessDays } from './vacationCalculationService';

import { checkOverlappingBookings } from './vacationOverlapService';

import {
  getVacationBookings,
  getVacationDaysUsed,
  getRemainingVacationDays,
} from './vacationQueryService';

// Re-export each async function individually
export {
  // Booking operations
  createVacationBooking,
  updateVacationBooking,
  deleteVacationBooking,

  // Calculations
  calculateBusinessDays,

  // Overlap detection
  checkOverlappingBookings,

  // Queries
  getVacationBookings,
  getVacationDaysUsed,
  getRemainingVacationDays,
};

// Note: Types are not exported here since they aren't async functions.
// Import them directly from vacationTypes.ts instead.
