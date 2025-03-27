'use server';

import { DateTime } from 'luxon';
import { supabase } from '@/lib/supabase';
import { isWeekend } from './holidayUtils';

export interface HolidayInfo {
  isHoliday: boolean;
  name?: string;
  type?: 'bank' | 'provincial';
}

export interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

/**
 * Map of Canadian province codes to their abbreviations for Nager.Date API
 */
const PROVINCE_MAPPING: Record<string, string[]> = {
  ON: ['ON'], // Ontario
  BC: ['BC'], // British Columbia
  AB: ['AB'], // Alberta
  QC: ['QC'], // Quebec
  MB: ['MB'], // Manitoba
  SK: ['SK'], // Saskatchewan
  NS: ['NS'], // Nova Scotia
  NB: ['NB'], // New Brunswick
  NL: ['NL'], // Newfoundland and Labrador
  PE: ['PE'], // Prince Edward Island
  YT: ['YT'], // Yukon
  NT: ['NT'], // Northwest Territories
  NU: ['NU'], // Nunavut
};

/**
 * Checks if a date is on a weekend (Saturday or Sunday)
 */
// Removed duplicate isWeekend function

/**
 * Checks if a date is a holiday for the specified province
 */
// Removed duplicate isHoliday function

/**
 * Fetches and returns holidays from the database for a specific date range and province
 */
export async function getHolidays(
  startDate: Date,
  endDate: Date,
  province: string
): Promise<Array<{
  id: string;
  date: Date;
  name: string;
  province: string | null;
  type: 'bank' | 'provincial';
}>> {
  // Find holidays in the database for the given date range and province
  const holidays = await supabase
    .from('holidays')
    .select('*')
    .gte('date', DateTime.fromJSDate(startDate).toISODate())
    .lte('date', DateTime.fromJSDate(endDate).toISODate())
    .or(`province.is.null,province.eq.${province}`);
  
  // If we have no holidays in the database for this period, fetch them
  if (holidays.data && holidays.data.length === 0) {
    await syncHolidaysForYear(DateTime.fromJSDate(startDate).year);
    
    // Try again after syncing
    return getHolidays(startDate, endDate, province);
  }
  
  return (holidays.data || []).map(holiday => {
    // Create a new DateTime from the holiday date in UTC to avoid timezone issues
    const luxonDate = DateTime.fromJSDate(new Date(holiday.date), { zone: 'utc' }).startOf('day');
    
    // Convert back to a JavaScript Date in UTC
    const fixedDate = luxonDate.toJSDate();
    
    return {
      id: holiday.id,
      date: fixedDate, // Use the UTC-fixed date
      name: holiday.name,
      province: holiday.province,
      type: holiday.type as 'bank' | 'provincial',
    };
  });
}

/**
 * Fetches holidays from Nager.Date API for a specific year
 */
export async function fetchHolidaysFromAPI(year: number): Promise<NagerHoliday[]> {
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/CA`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }
    
    return await response.json() as NagerHoliday[];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

/**
 * Determines if a holiday is a bank holiday (non-working day)
 */
function isBankHoliday(holiday: NagerHoliday): boolean {
  // Consider any national holiday (global true) as a bank holiday
  // or holidays that are specifically marked as "Public" type
  return holiday.global || holiday.types.includes('Public');
}

/**
 * Syncs holidays for a specific year from the Nager.Date API to our database
 */
export async function syncHolidaysForYear(year: number): Promise<void> {
  const nagerHolidays = await fetchHolidaysFromAPI(year);
  
  if (nagerHolidays.length === 0) {
    return;
  }
  
  // Define the type for our database format
  type HolidayInsert = {
    date: Date;
    name: string;
    province: string | null;
    type: string;
  };
  
  // Transform the Nager holidays to our database format
  const holidaysToInsert = nagerHolidays.flatMap((holiday): HolidayInsert[] => {
    const isBank = isBankHoliday(holiday);
    
    // Parse the ISO date string to a DateTime object in UTC
    const dt = DateTime.fromISO(holiday.date, { zone: 'utc' }).startOf('day');
    
    // Check if date is valid before proceeding
    if (!dt.isValid) {
      console.error(`Invalid date for holiday: ${holiday.localName}`);
      return [];
    }
    
    // Create a date directly from the Luxon DateTime
    const date = dt.toJSDate();
    
    // For global holidays (apply to all provinces)
    if (holiday.global) {
      return [{
        date,
        name: holiday.localName,
        province: null, // National holiday
        type: isBank ? 'bank' : 'provincial',
      }];
    }
    
    // For non-global holidays, create an entry for each province it applies to
    if (holiday.counties && holiday.counties.length > 0) {
      return holiday.counties.map(county => ({
        date,
        name: holiday.localName,
        province: county, // Provincial specific
        type: isBank ? 'bank' : 'provincial',
      }));
    }
    
    // If no specific provinces are listed but it's not global,
    // we'll still add it but mark as provincial
    return [{
      date,
      name: holiday.localName,
      province: null,
      type: 'provincial',
    }];
  });
  
  // Delete existing holidays for this year to avoid duplicates
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  
  await supabase
    .from('holidays')
    .delete()
    .gte('date', DateTime.fromJSDate(startOfYear).toISODate())
    .lte('date', DateTime.fromJSDate(endOfYear).toISODate());
  
  // Insert the new holidays
  if (holidaysToInsert.length > 0) {
    await supabase
      .from('holidays')
      .insert(holidaysToInsert);
  }
}

/**
 * Server-only service for handling holiday operations
 */
// Removed duplicate getHolidays function

// isWeekend function moved to holidayUtils.ts and imported at the top

export async function isHoliday(
  date: Date,
  province: string
): Promise<{ isHoliday: boolean; name: string | null }> {
  try {
    const dateStr = DateTime.fromJSDate(date).toISODate();
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('date', dateStr)
      .or(`province.is.null,province.eq.${province}`);
    
    if (error) {
      console.error('Error checking holiday:', error);
      return { isHoliday: false, name: null };
    }
    
    if (data && data.length > 0) {
      return { isHoliday: true, name: data[0].name };
    }
    
    return { isHoliday: false, name: null };
  } catch (error) {
    console.error('Error checking holiday:', error);
    return { isHoliday: false, name: null };
  }
}

// Helper function to fetch holidays from API
// Removed duplicate fetchHolidaysFromAPI function

interface Holiday {
  id: string;
  date: string | Date;
  name: string;
  province: string | null;
  type: string;
}

/**
 * Get holidays between start and end dates for a specific province
 */
export async function getHolidaysInRange(
  startDate: Date,
  endDate: Date,
  province: string
): Promise<Holiday[]> {
  try {
    const startDateStr = DateTime.fromJSDate(startDate).toISODate();
    const endDateStr = DateTime.fromJSDate(endDate).toISODate();
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .or(`province.is.null,province.eq.${province}`);
    
    if (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

/**
 * Get all holidays for a specific year and province
 */
export async function getHolidaysByYear(
  year: number,
  province: string
): Promise<Holiday[]> {
  try {
    const startDate = DateTime.local(year, 1, 1).toISODate();
    const endDate = DateTime.local(year, 12, 31).toISODate();
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .or(`province.is.null,province.eq.${province}`);
    
    if (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

/**
 * Import holidays for a specific year and province
 */
export async function importHolidays(
  holidays: Omit<Holiday, 'id'>[],
  year: number,
  province: string
): Promise<void> {
  try {
    // First, delete existing holidays for this year and province
    const startDate = DateTime.local(year, 1, 1).toISODate();
    const endDate = DateTime.local(year, 12, 31).toISODate();
    
    // Delete national holidays for this year
    const { error: deleteNationalError } = await supabase
      .from('holidays')
      .delete()
      .is('province', null)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (deleteNationalError) {
      console.error('Error deleting national holidays:', deleteNationalError);
    }
    
    // Delete provincial holidays for this year
    const { error: deleteProvincialError } = await supabase
      .from('holidays')
      .delete()
      .eq('province', province)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (deleteProvincialError) {
      console.error('Error deleting provincial holidays:', deleteProvincialError);
    }
    
    // Insert new holidays
    if (holidays.length > 0) {
      const { error: insertError } = await supabase
        .from('holidays')
        .insert(holidays);
      
      if (insertError) {
        console.error('Error inserting holidays:', insertError);
        throw new Error(`Failed to import holidays: ${insertError.message}`);
      }
    }
  } catch (error) {
    console.error('Error importing holidays:', error);
    throw new Error('Failed to import holidays');
  }
}

/**
 * Check if a holiday already exists in the database
 */
export async function holidayExists(
  date: Date,
  name: string,
  province: string | null
): Promise<boolean> {
  try {
    const dateStr = DateTime.fromJSDate(date).toISODate();
    
    const { data, error } = await supabase
      .from('holidays')
      .select('id')
      .eq('date', dateStr)
      .eq('name', name);
    
    if (province) {
      const query = supabase.from('holidays').select('id').eq('province', province);
    }
    
    if (error) {
      console.error('Error checking holiday exists:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking holiday exists:', error);
    return false;
  }
}