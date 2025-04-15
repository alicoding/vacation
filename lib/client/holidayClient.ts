// filepath: lib/clients/holidayClient.ts (or similar)

import { Holiday as GlobalHoliday } from '@/types';

export interface HolidayInfo {
  isHoliday: boolean;
  name: string | null;
  type: string | null;
}

// Local Holiday type aligned with GlobalHoliday from backend
export interface Holiday {
  id: string;
  date: string; // Matches DB and API response format
  name: string;
  province?: string | null;
  type: 'bank' | 'provincial';
  description?: string;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export async function checkIsHoliday(
  date: Date,
  province: string,
): Promise<HolidayInfo> {
  if (!date || !province) {
    throw new Error('Date and province are required');
  }

  const dateStr = date.toISOString().split('T')[0];
  const response = await fetch(
    `/api/holidays?date=${encodeURIComponent(dateStr)}&province=${encodeURIComponent(province)}`,
  );

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({
      error: response.statusText,
    }));

    const errorMessage =
      typeof errorData === 'object' &&
      errorData !== null &&
      typeof (errorData as any).error === 'string'
        ? (errorData as any).error
        : response.statusText;

    throw new Error(`Failed to check holiday: ${errorMessage}`);
  }

  return await response.json();
}

export async function fetchHolidays(
  startDate: Date,
  endDate: Date,
  province: string,
): Promise<Holiday[]> {
  if (!startDate || !endDate || !province) {
    throw new Error('Start date, end date, and province are required');
  }

  const response = await fetch('/api/holidays/range', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      province,
    }),
  });

  if (!response.ok) {
    const errorData: unknown = await response.json().catch(() => ({
      error: response.statusText,
    }));

    const errorMessage =
      typeof errorData === 'object' &&
      errorData !== null &&
      typeof (errorData as any).error === 'string'
        ? (errorData as any).error
        : response.statusText;

    throw new Error(`Failed to fetch holidays: ${errorMessage}`);
  }

  const rawData: unknown = await response.json();

  if (!Array.isArray(rawData)) {
    throw new Error('Invalid holidays response format');
  }

  return rawData.map((h) => {
    if (
      typeof h !== 'object' ||
      h === null ||
      typeof h.id !== 'string' ||
      typeof h.date !== 'string' ||
      typeof h.name !== 'string' ||
      (typeof h.type !== 'string' && !Array.isArray(h.type))
    ) {
      throw new Error('Malformed holiday entry');
    }

    return h as Holiday;
  });
}

interface GetHolidaysInRangeProps {
  startDate: string;
  endDate: string;
  province?: string;
}

class HolidayClient {
  async getHolidaysForYear(
    year: number,
    province?: string,
  ): Promise<GlobalHoliday[]> {
    try {
      const url = new URL('/api/holidays', window.location.origin);
      url.searchParams.append('year', year.toString());
      if (province) url.searchParams.append('province', province);

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData: unknown = await response
          .json()
          .catch(() => ({ error: response.statusText }));

        const errorMessage =
          typeof errorData === 'object' &&
          errorData !== null &&
          typeof (errorData as any).error === 'string'
            ? (errorData as any).error
            : response.statusText;

        throw new Error(`Failed to fetch holidays: ${errorMessage}`);
      }

      const data: unknown = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid holiday data format received');
      }

      return data as GlobalHoliday[];
    } catch (error) {
      console.error('Error fetching holidays for year:', error);
      return [];
    }
  }

  async getHolidaysInRange({
    startDate,
    endDate,
    province,
  }: GetHolidaysInRangeProps): Promise<GlobalHoliday[]> {
    try {
      const response = await fetch('/api/holidays/range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, province }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch holidays');
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid data format');
      }

      return data;
    } catch (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  }
}

export const holidayClient = new HolidayClient();
