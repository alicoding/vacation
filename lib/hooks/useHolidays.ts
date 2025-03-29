'use client';
import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Holiday } from '@/types';

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
    if (!year) {
      console.error('[useHolidays] Year is required');
      setError('Year is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`[useHolidays] Fetching holidays for year ${year} and province ${province || 'default'}`);
      
      // Use direct API call to /api/holidays
      const url = `/api/holidays?year=${year}${province ? `&province=${province}` : ''}`;
      console.log(`[useHolidays] API URL: ${url}`);
      
      const response = await fetch(url, {
        // Include credentials and cache settings
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useHolidays] HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const holidayData = await response.json();
      console.log('[useHolidays] Raw holiday data:', holidayData);
      
      if (!Array.isArray(holidayData)) {
        console.error('[useHolidays] Expected array of holidays but got:', typeof holidayData);
        setHolidays([]);
        return;
      }

      // Check if we got any holidays
      if (holidayData.length === 0) {
        console.warn('[useHolidays] No holidays returned from API');
        
        // Force a sync if no holidays found
        try {
          console.log('[useHolidays] Attempting to force sync holidays');
          const syncResponse = await fetch('/api/holidays', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ year }),
          });

          if (syncResponse.ok) {
            console.log('[useHolidays] Holiday sync successful, fetching again');
            // Fetch holidays again after successful sync
            const refetchResponse = await fetch(url);
            if (refetchResponse.ok) {
              const refetchedData = await refetchResponse.json();
              if (Array.isArray(refetchedData) && refetchedData.length > 0) {
                holidayData.push(...refetchedData);
              }
            }
          }
        } catch (syncError) {
          console.error('[useHolidays] Error syncing holidays:', syncError);
        }
      }
      
      // Transform dates into consistent ISO format
      const formattedHolidays = holidayData.map((h: any) => {
        if (!h) {
          console.error('[useHolidays] Null or undefined holiday in data');
          return null;
        }

        // Ensure the date is properly formatted
        let formattedDate: string;
        
        try {
          if (typeof h.date === 'string') {
            // Handle ISO string
            formattedDate = DateTime.fromISO(h.date).toISO() || h.date;
          } else if (typeof h.date === 'object' && h.date !== null) {
            // Handle Date object
            formattedDate = DateTime.fromJSDate(new Date(h.date)).toISO() || new Date(h.date).toISOString();
          } else {
            console.error('[useHolidays] Invalid date format:', h.date);
            formattedDate = new Date().toISOString(); // Default to today as fallback
          }
        } catch (dateError) {
          console.error('[useHolidays] Error parsing date:', h.date, dateError);
          formattedDate = new Date().toISOString(); // Default to today as fallback
        }
        
        return {
          ...h,
          date: formattedDate,
          // Ensure all required fields are present
          id: h.id || `holiday-${h.name}-${formattedDate}`,
          type: h.type || 'bank',
          name: h.name || 'Unknown Holiday',
        };
      }).filter(Boolean); // Remove any null entries
      
      console.log('[useHolidays] Formatted holidays:', formattedHolidays);
      setHolidays(formattedHolidays);
    } catch (err) {
      console.error('[useHolidays] Error fetching holidays:', err);
      setError('Failed to load holidays. Please try again later.');
      setHolidays([]); // Clear holidays on error
    } finally {
      setLoading(false);
    }
  };

  // Add year and province to dependencies to ensure refetch when they change
  useEffect(() => {
    console.log('[useHolidays] useEffect triggered with year:', year, 'province:', province);
    fetchHolidays();
  }, [year, province]); // Properly depend on both year and province

  // Check if a date is a holiday
  const isHoliday = (dateString: string) => {
    if (!dateString) {
      return { isHoliday: false };
    }

    let normalizedDate: string;
    try {
      normalizedDate = DateTime.fromISO(dateString).toISODate() || '';
    } catch (e) {
      console.error(`[useHolidays] Error parsing date string: ${dateString}`, e);
      return { isHoliday: false };
    }
    
    if (holidays.length === 0) {
      console.log(`[useHolidays] No holidays available when checking ${normalizedDate}`);
      return { isHoliday: false };
    }
    
    const holiday = holidays.find((h) => {
      // Handle different date formats but standardize to ISO date string
      let holidayDate: string | null = null;
      
      try {
        if (typeof h.date === 'string') {
          holidayDate = DateTime.fromISO(h.date).toISODate();
        } else {
          // Use type checking without instanceof for better TypeScript support
          // Create a DateTime from whatever the date is
          const dateObj = typeof h.date === 'object' ? h.date : new Date();
          holidayDate = DateTime.fromJSDate(new Date(dateObj as any)).toISODate();
        }
      } catch (e) {
        console.error(`[useHolidays] Error parsing holiday date: ${h.date}`, e);
        return false;
      }
      
      const match = holidayDate === normalizedDate;
      if (match) {
        console.log(`[useHolidays] Holiday match found for ${normalizedDate}: ${h.name}`);
      }
      return match;
    });
    
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
    if (!dateString) return undefined;

    let normalizedDate: string;
    try {
      normalizedDate = DateTime.fromISO(dateString).toISODate() || '';
    } catch (e) {
      console.error(`[useHolidays] Error parsing date string: ${dateString}`, e);
      return undefined;
    }
    
    return holidays.find((h) => {
      let holidayDate: string | null = null;
      
      try {
        if (typeof h.date === 'string') {
          holidayDate = DateTime.fromISO(h.date).toISODate();
        } else {
          // Use type checking without instanceof for better TypeScript support
          const dateObj = typeof h.date === 'object' ? h.date : new Date();
          holidayDate = DateTime.fromJSDate(new Date(dateObj as any)).toISODate();
        }
      } catch (e) {
        console.error(`[useHolidays] Error parsing holiday date: ${h.date}`, e);
        return false;
      }
      
      return holidayDate === normalizedDate;
    });
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