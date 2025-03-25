"use client";

import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
  relevantToEmploymentType?: boolean;
}

export interface UseHolidaysResult {
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  refreshHolidays: () => Promise<void>;
  isHoliday: (dateString: string) => { isHoliday: boolean; name?: string; type?: 'bank' | 'provincial' };
  getHoliday: (dateString: string) => Holiday | undefined;
}

export default function useHolidays(
  startDate: Date | string = new Date(new Date().getFullYear(), 0, 1),
  endDate: Date | string = new Date(new Date().getFullYear(), 11, 31),
  province?: string,
  employmentType?: string
): UseHolidaysResult {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      return date.includes('T') ? date.split('T')[0] : date;
    }
    return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
  };
  
  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('startDate', formatDate(startDate));
      params.append('endDate', formatDate(endDate));
      if (province) {
        params.append('province', province);
      }
      if (employmentType) {
        params.append('employment_type', employmentType);
      }
      
      // Fetch holidays from API
      const response = await fetch(`/api/holidays?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch holidays');
      }
      
      const data = await response.json();
      setHolidays(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch holidays on component mount and when dependencies change
  useEffect(() => {
    fetchHolidays();
  }, [formatDate(startDate), formatDate(endDate), province, employmentType]);
  
  // Check if a date is a holiday
  const isHoliday = (dateString: string) => {
    const normalizedDate = formatDate(dateString);
    const holiday = holidays.find(h => formatDate(h.date) === normalizedDate);
    
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
    const normalizedDate = formatDate(dateString);
    return holidays.find(h => formatDate(h.date) === normalizedDate);
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