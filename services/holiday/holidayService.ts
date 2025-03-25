'use server';

import { prisma } from '@/lib/prisma';
import { DateTime } from 'luxon';
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
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
      OR: [
        { province: null }, // National holidays
        { province: province }, // Province-specific holidays
      ],
    },
    orderBy: {
      date: 'asc',
    },
  });
  
  // If we have no holidays in the database for this period, fetch them
  if (holidays.length === 0) {
    await syncHolidaysForYear(DateTime.fromJSDate(startDate).year);
    
    // Try again after syncing
    return getHolidays(startDate, endDate, province);
  }
  
  return holidays.map(holiday => {
    // Create a new DateTime from the holiday date in UTC to avoid timezone issues
    const luxonDate = DateTime.fromJSDate(holiday.date, { zone: 'utc' }).startOf('day');
    
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
  
  await prisma.holiday.deleteMany({
    where: {
      date: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
  });
  
  // Insert the new holidays
  if (holidaysToInsert.length > 0) {
    await prisma.holiday.createMany({
      data: holidaysToInsert,
      skipDuplicates: true,
    });
  }
}

/**
 * Server-only service for handling holiday operations
 */
// Removed duplicate getHolidays function

// isWeekend function moved to holidayUtils.ts and imported at the top

export async function isHoliday(date: Date, province: string) {
  // Create a DateTime object in UTC from the input date and get start of day
  const dt = DateTime.fromJSDate(date, { zone: 'utc' }).startOf('day');
  const dateStr = dt.toISODate();
  
  if (!dateStr) {
    return {
      isHoliday: false,
      name: null,
      type: null
    };
  }
  
  // Create a date to query with using the Luxon DateTime
  const queryDate = dt.toJSDate();
  
  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        equals: queryDate,
      },
      OR: [
        { province: province },
        { province: null } // National holidays
      ]
    },
  });
  
  return {
    isHoliday: !!holiday,
    name: holiday?.name || null,
    type: holiday?.type || null
  };
}

// Helper function to fetch holidays from API
// Removed duplicate fetchHolidaysFromAPI function