// filepath: /utils/googleCalendar/eventManager.ts
import { DateTime } from 'luxon';
import { getGoogleToken } from './tokenManager';
import { CalendarEvent, VacationEventData } from './types';

async function parseResponse<T>(response: Response): Promise<T> {
  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok || typeof raw !== 'object' || raw === null) {
    const errorMsg =
      typeof raw === 'object' &&
      raw !== null &&
      'error' in raw &&
      typeof (raw as any).error?.message === 'string'
        ? (raw as any).error.message
        : response.statusText;

    throw new Error(`Google Calendar API error: ${errorMsg}`);
  }

  return raw as T;
}

export async function createCalendarEvent(
  userId: string,
  vacation: VacationEventData,
): Promise<{ id: string }> {
  const token = await getGoogleToken(userId);
  if (!token) throw new Error('No valid Google token found');

  const start = DateTime.fromISO(vacation.start_date).toISODate();
  const end = DateTime.fromISO(vacation.end_date).plus({ days: 1 }).toISODate();

  if (!start || !end) throw new Error('Invalid vacation dates');

  const event: CalendarEvent = {
    summary: vacation.title || 'Vacation',
    description: vacation.note || 'Time off from work',
    start: { date: start, timeZone: 'UTC' },
    end: { date: end, timeZone: 'UTC' },
    colorId: '5',
    extendedProperties: { private: { vacationId: vacation.id } },
  };

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

  return parseResponse<{ id: string }>(response);
}

export async function updateCalendarEvent(
  userId: string,
  googleEventId: string,
  vacation: VacationEventData,
): Promise<{ id: string }> {
  const token = await getGoogleToken(userId);
  if (!token) throw new Error('No valid Google token found');

  const start = DateTime.fromISO(vacation.start_date).toISODate();
  const end = DateTime.fromISO(vacation.end_date).plus({ days: 1 }).toISODate();

  if (!start || !end) throw new Error('Invalid vacation dates');

  const event: CalendarEvent = {
    summary: vacation.title || 'Vacation',
    description: vacation.note || 'Time off from work',
    start: { date: start, timeZone: 'UTC' },
    end: { date: end, timeZone: 'UTC' },
    colorId: '5',
    extendedProperties: { private: { vacationId: vacation.id } },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId,
    )}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    },
  );

  return parseResponse<{ id: string }>(response);
}

export async function deleteCalendarEvent(
  userId: string,
  googleEventId: string,
): Promise<boolean> {
  const token = await getGoogleToken(userId);
  if (!token) throw new Error('No valid Google token found');

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(
      googleEventId,
    )}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (response.status === 404) return true; // Already deleted

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => null);
    const errorMsg =
      typeof errorData === 'object' &&
      errorData !== null &&
      'error' in errorData &&
      typeof (errorData as any).error?.message === 'string'
        ? (errorData as any).error.message
        : response.statusText;

    throw new Error(`Google Calendar API error: ${errorMsg}`);
  }

  return true;
}

export async function findCalendarEventByVacationId(
  userId: string,
  vacationId: string,
): Promise<string | null> {
  const token = await getGoogleToken(userId);
  if (!token) return null;

  const params = new URLSearchParams({
    privateExtendedProperty: `vacationId=${vacationId}`,
    maxResults: '1',
    fields: 'items(id)',
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) return null;

  const data: unknown = await response.json().catch(() => null);

  if (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as any).items)
  ) {
    const first = (data as any).items[0];
    if (first && typeof first.id === 'string') return first.id;
  }

  return null;
}
