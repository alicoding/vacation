/**
 * Client-side functions for holiday-related operations
 * These make API calls to server endpoints instead of using database clients directly
 */
import { Holiday as GlobalHoliday } from '@/types';

export interface HolidayInfo {
  isHoliday: boolean;
  name: string | null;
  type: string | null;
}

// Update this interface to match the global Holiday type
export interface Holiday {
  id: string;
  date: string; // Changed from Date to string to match types/index.ts
  name: string;
  province?: string | null;
  type: 'bank' | 'provincial';
  description?: string;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

export async function checkIsHoliday(date: Date, province: string): Promise<HolidayInfo> {
  if (!date || !province) {
    throw new Error('Date and province are required');
  }

  const dateStr = date.toISOString().split('T')[0];
  const response = await fetch(`/api/holidays?date=${encodeURIComponent(dateStr)}&province=${encodeURIComponent(province)}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to check holiday: ${errorData.error || response.statusText}`);
  }
  
  return response.json();
}

export async function fetchHolidays(
  startDate: Date, 
  endDate: Date, 
  province: string
): Promise<Holiday[]> {
  if (!startDate || !endDate || !province) {
    throw new Error('Start date, end date, and province are required');
  }

  const response = await fetch('/api/holidays/range', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      province,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(`Failed to fetch holidays: ${errorData.error || response.statusText}`);
  }
  
  const holidays = await response.json();
  return holidays.map((h: any) => ({
    ...h,
    date: new Date(h.date),
  }));
}

interface GetHolidaysInRangeProps {
  startDate: string;
  endDate: string;
  province?: string;
}

class HolidayClient {
  /**
   * Fetches holidays for a given date range
   */
  async getHolidaysInRange({ 
    startDate, 
    endDate, 
    province 
  }: GetHolidaysInRangeProps): Promise<GlobalHoliday[]> {
    try {
      const url = new URL('/api/holidays/range', window.location.origin);
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);
      if (province) {
        url.searchParams.append('province', province);
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error('Failed to fetch holidays');
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const holidayClient = new HolidayClient();
