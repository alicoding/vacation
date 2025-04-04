// filepath: /Users/ali/Documents/projects/vacation/utils/googleCalendar/types.ts

/**
 * Type definitions for Google Calendar integration
 */

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone: string;
  };
  colorId?: string;
  // Add extendedProperties to match Google API structure
  extendedProperties?: {
    private?: { [key: string]: string };
    shared?: { [key: string]: string };
  };
}

export interface VacationEventData {
  id: string;
  title?: string;
  note?: string;
  start_date: string;
  end_date: string;
  google_event_id?: string | null;
}

export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleTokenData {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'disabled';