// filepath: /Users/ali/Documents/projects/vacation/utils/googleCalendar/eventManager.ts
import { DateTime } from 'luxon';
// Remove googleapis import: import { google } from 'googleapis';
import { getGoogleToken } from './tokenManager';
import { CalendarEvent, VacationEventData } from './types';

/**
 * Creates a calendar event for a vacation
 */
export async function createCalendarEvent(
  userId: string,
  vacation: VacationEventData, // Includes vacation.id
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
    // Add extended property to link event back to our vacation ID
    extendedProperties: {
      private: { vacationId: vacation.id },
    },
  };

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google Calendar API error: ${errorData.error?.message || response.statusText}`,
      );
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
  vacation: VacationEventData, // Change to full VacationEventData to access vacation.id
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
    // Ensure extended property is maintained during update
    extendedProperties: {
      private: { vacationId: vacation.id },
    },
  };

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Google Calendar API error: ${errorData.error?.message || response.statusText}`,
      );
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
export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string,
): Promise<boolean> {
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
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      // If the error is 404, the event was already deleted or doesn't exist
      if (response.status === 404) {
        return true;
      }

      const errorData = await response.json();
      throw new Error(
        `Google Calendar API error: ${errorData.error?.message || response.statusText}`,
      );
    }

    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    throw error;
  }
}

/*
 * Finds a Google Calendar event associated with a specific vacation ID
 * using extended properties.
 * @returns The Google Calendar event ID if found, otherwise null.
 */
export async function findCalendarEventByVacationId(
  userId: string,
  vacationId: string,
): Promise<string | null> {
  const token = await getGoogleToken(userId);
  if (!token) {
    console.error(
      `[findCalendarEventByVacationId] No valid Google token for user ${userId}`,
    );
    // Decide if throwing or returning null is better. Returning null might be safer.
    return null;
  }

  // Construct the API URL for listing events with the private extended property filter
  const encodedVacationId = encodeURIComponent(vacationId);
  const searchParams = new URLSearchParams({
    privateExtendedProperty: `vacationId=${encodedVacationId}`,
    maxResults: '1',
    fields: 'items(id)', // Only fetch the event ID
  });
  const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${searchParams.toString()}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Google Calendar API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (data.items && data.items.length > 0 && data.items[0].id) {
      console.log(
        `[findCalendarEventByVacationId] Found existing event for vacation ${vacationId}: ${data.items[0].id}`,
      );
      return data.items[0].id;
    } else {
      console.log(
        `[findCalendarEventByVacationId] No existing event found for vacation ${vacationId}`,
      );
      return null;
    }
  } catch (error: any) {
    console.error(
      `[findCalendarEventByVacationId] Error searching for event for vacation ${vacationId}:`,
      error.message || error,
    );
    // Depending on the error, might want to throw or return null
    return null; // Return null on error to avoid blocking sync
  }
}
