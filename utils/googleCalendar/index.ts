/**
 * Google Calendar Integration
 *
 * This module provides a complete solution for syncing vacation bookings
 * with Google Calendar, including authentication, event management,
 * and syncing operations.
 */

// Export types
export * from './types';

// Export token management functions
export {
  getGoogleToken,
  refreshAccessToken,
  hasCalendarAuthorization,
  getAuthorizationUrl,
} from './tokenManager';

// Export event management functions
export {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './eventManager';

// Export sync management functions
export {
  syncVacationToCalendar,
  handleVacationDeletion,
  syncAllVacations,
  updateCalendarSyncPreference,
  updateVacationInGoogle,
} from './syncManager';
