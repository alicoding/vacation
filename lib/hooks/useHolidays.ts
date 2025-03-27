'use client';

import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Holiday } from '@/types';
import { holidayClient } from '@/lib/client/holidayClient';

// Re-export the Holiday type for components that import from this file
export type { Holiday };

export interface UseHolidaysResult {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  refreshHolidays: () => Promise<void>;
  isHoliday: (dateString: string) => { isHoliday: boolean; name?: string; type?: 'bank' | 'provincial' };
  getHoliday: (dateString: string) => Holiday | undefined;
}

export function useHolidays(year: number, province?: string): UseHolidaysResult {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the start of the year and end of the year for range
      const startDate = DateTime.fromObject({ year }).startOf('year').toISODate();
      const endDate = DateTime.fromObject({ year }).endOf('year').toISODate();
      
      if (!startDate || !endDate) {
        throw new Error('Invalid date range');
      }
      
      // Fetch holidays for the date range
      const response = await holidayClient.getHolidaysInRange({
        startDate,
        endDate,
        province
      });
      
      setHolidays(response);
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setError('Failed to load holidays. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
    // We intentionally omit fetchHolidays from deps because it would cause an infinite loop
    // The function only depends on year and province which are already included
  }, [year, province]);

  // Check if a date is a holiday
  const isHoliday = (dateString: string) => {
    const normalizedDate = DateTime.fromISO(dateString).toISODate();
    const holiday = holidays.find(h => DateTime.fromISO(h.date).toISODate() === normalizedDate);
    
    if (!holiday) {
      return { isHoliday: false };
    }
    
    return {
      isHoliday: true,
      name: holiday.name,
      type: holiday.type,
    };
  };
  
  // Get holiday information for a specific date
  const getHoliday = (dateString: string) => {
    const normalizedDate = DateTime.fromISO(dateString).toISODate();
    return holidays.find(h => DateTime.fromISO(h.date).toISODate() === normalizedDate);
  };

  return {
    holidays,
    loading,
    error,
    refreshHolidays: fetchHolidays,
    isHoliday,
    getHoliday,
  };
}

// Default export of the hook to fix the import issue
export default useHolidays;