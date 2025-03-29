// filepath: /Users/ali/Documents/projects/vacation/utils/googleCalendar/eventManager.ts
import { DateTime } from 'luxon';
import { getGoogleToken } from './tokenManager';
import { CalendarEvent, VacationEventData } from './types';

/**
 * Creates a calendar event for a vacation
 */
export async function createCalendarEvent(
  userId: string, 
  vacation: VacationEventData,
): Promise<{ id: string } | null> {
  const token = await getGoogleToken(userId);
  
  if (!token) {
    throw new Error('No valid Google token found');
  }
  
  // Format the dates correctly for an all-day event
  // Use Luxon for date handling per project guidelines
  const startDateTime = DateTime.fromISO(vacation.start_date);
  const endDateTime = DateTime.fromISO(vacation.end_date);
  
  if (!startDateTime.isValid || !endDateTime.isValid) {
    throw new Error('Invalid vacation dates');
  }

  const startDate = startDateTime.toISODate();
  const endDate = endDateTime.toISODate();
  
  if (!startDate || !endDate) {
    throw new Error('Invalid vacation dates');
  }

  // For all-day events in Google Calendar, the end date needs to be the day AFTER
  // the actual end date because Google Calendar uses exclusive end dates
  const endDateAdjusted = endDateTime.plus({ days: 1 }).toISODate();
  
  if (!endDateAdjusted) {
    throw new Error('Invalid end date calculation');
  }
  
  const event: CalendarEvent = {
    summary: vacation.title || 'Vacation',
    description: vacation.note || 'Time off from work',
    start: {
      date: startDate,
      timeZone: 'UTC',
    },
    end: {
      date: endDateAdjusted,
      timeZone: 'UTC',
    },
    colorId: '5', // A nice vacation color
  };
  
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}

/**
 * Updates an existing calendar event for a vacation
 */
export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  vacation: Omit<VacationEventData, 'id' | 'google_event_id'>,
): Promise<{ id: string } | null> {
  const token = await getGoogleToken(userId);
  
  if (!token) {
    throw new Error('No valid Google token found');
  }
  
  // Format the dates correctly for an all-day event
  const startDateTime = DateTime.fromISO(vacation.start_date);
  const endDateTime = DateTime.fromISO(vacation.end_date);
  
  if (!startDateTime.isValid || !endDateTime.isValid) {
    throw new Error('Invalid vacation dates');
  }

  const startDate = startDateTime.toISODate();
  const endDate = endDateTime.toISODate();
  
  if (!startDate || !endDate) {
    throw new Error('Invalid vacation dates');
  }

  // For all-day events in Google Calendar, the end date needs to be the day AFTER
  // the actual end date because Google Calendar uses exclusive end dates
  const endDateAdjusted = endDateTime.plus({ days: 1 }).toISODate();
  
  if (!endDateAdjusted) {
    throw new Error('Invalid end date calculation');
  }
  
  const event: CalendarEvent = {
    summary: vacation.title || 'Vacation',
    description: vacation.note || 'Time off from work',
    start: {
      date: startDate,
      timeZone: 'UTC',
    },
    end: {
      date: endDateAdjusted,
      timeZone: 'UTC',
    },
    colorId: '5', // A nice vacation color
  };
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    throw error;
  }
}

/**
 * Deletes a calendar event for a vacation
 */
export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<boolean> {
  const token = await getGoogleToken(userId);
  
  if (!token) {
    throw new Error('No valid Google token found');
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    );
    
    if (!response.ok) {
      // If the error is 404, the event was already deleted or doesn't exist
      if (response.status === 404) {
        return true;
      }
      
      const errorData = await response.json();
      throw new Error(`Google Calendar API error: ${errorData.error?.message || response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    throw error;
  }
}