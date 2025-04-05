'use server';

import { DateTime } from 'luxon';
import { unstable_noStore as noStore } from 'next/cache'; // Import noStore
// Import the new helper, remove the old one if not needed
import { createAuthedServerClient } from '@/lib/supabase.server';
import { createServiceClient } from '@/lib/supabase.shared';
// Remove cookies import
// import { cookies } from 'next/headers';
// Helper function to safely parse JSON strings
function safeJsonParse(jsonString: string | null | undefined): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    // Ensure the parsed result is an array of strings
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed;
    }
    // Handle cases where it's a single string (maybe old data?)
    if (typeof parsed === 'string') {
      return [parsed];
    }
    return []; // Return empty array if not an array of strings
  } catch (e) {
    console.error('Failed to parse holiday type JSON:', jsonString, e);
    // Handle cases where the string might not be valid JSON array
    // Return it as a single-element array if it's just a plain string? Or empty?
    return typeof jsonString === 'string' ? [jsonString] : [];
  }
}

// Define the return type expected by components (with type as string[])
// Moved this interface definition higher for clarity
export interface HolidayWithTypeArray {
  id: string;
  date: Date; // Use Date object for consistency in return types
  name: string;
  province: string | null;
  type: string[];
}

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
 * Fetches holidays from Nager.Date API for a specific year
 */
export async function fetchHolidaysFromAPI(
  year: number,
): Promise<NagerHoliday[]> {
  try {
    const response = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/CA`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }

    return (await response.json()) as NagerHoliday[];
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

  // Use service role client to bypass RLS for admin operations
  const supabaseServer = createServiceClient();

  // Define the type for our database format
  interface HolidayInsert {
    date: string; // Changed from Date to string to match Supabase schema requirements
    name: string;
    province: string | null;
    type: string; // Store as JSON string in DB
  }

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

    // Convert the Luxon DateTime to an ISO date string for Supabase
    const dateStr = dt.toISODate();

    // For global holidays (apply to all provinces)
    if (holiday.global) {
      return [
        {
          date: dateStr,
          name: holiday.localName,
          province: null, // National holiday
          type: JSON.stringify(holiday.types), // Store as JSON string
        },
      ];
    }

    // For non-global holidays, create an entry for each province it applies to
    if (holiday.counties && holiday.counties.length > 0) {
      return holiday.counties.map((county) => ({
        date: dateStr,
        name: holiday.localName,
        province: county, // Provincial specific
        type: JSON.stringify(holiday.types), // Store as JSON string
      }));
    }

    // If no specific provinces are listed but it's not global,
    // we'll still add it but mark as provincial
    return [
      {
        date: dateStr,
        name: holiday.localName,
        province: null,
        // Default to Public if types array is empty, store as JSON string
        type: JSON.stringify(
          holiday.types.length > 0 ? holiday.types : ['Public'],
        ),
      },
    ];
  });

  // Delete existing holidays for this year to avoid duplicates
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const { error: deleteError } = await supabaseServer
    .from('holidays')
    .delete()
    .gte('date', DateTime.fromJSDate(startOfYear).toISODate())
    .lte('date', DateTime.fromJSDate(endOfYear).toISODate());

  if (deleteError) {
    console.error('Error deleting existing holidays:', deleteError);
    throw new Error(
      `Failed to delete existing holidays: ${deleteError.message}`,
    );
  }

  // Insert the new holidays
  if (holidaysToInsert.length > 0) {
    const { error: insertError } = await supabaseServer
      .from('holidays')
      .insert(holidaysToInsert);

    if (insertError) {
      console.error('Error inserting holidays:', insertError);
      throw new Error(`Failed to insert holidays: ${insertError.message}`);
    }
  }
}

/**
 * Server-only service for handling holiday operations
 */
export async function isHoliday(
  date: Date,
  province: string,
): Promise<{ isHoliday: boolean; name: string | null }> {
  try {
    // Use the new helper
    const supabaseServer = await createAuthedServerClient();

    const dateStr = DateTime.fromJSDate(date).toISODate();

    if (!dateStr) {
      console.error('Invalid date for holiday check');
      return { isHoliday: false, name: null };
    }

    const { data, error } = await supabaseServer
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

interface Holiday {
  id: string;
  date: string | Date;
  name: string;
  province: string | null;
  type: string[]; // Represents the parsed type after retrieval
}

/**
 * Get holidays between start and end dates for a specific province
 */
export async function getHolidaysInRange(
  startDate: Date,
  endDate: Date,
  province: string,
  // Return type should reflect the parsed data structure using HolidayWithTypeArray
): Promise<HolidayWithTypeArray[]> {
  try {
    noStore(); // Opt out of caching for this function
    // Use the new helper
    const supabaseServer = await createAuthedServerClient();

    // Force UTC zone when creating Luxon DateTime from JS Date
    const startDateStr = DateTime.fromJSDate(startDate, {
      zone: 'utc',
    }).toISODate();
    const endDateStr = DateTime.fromJSDate(endDate, {
      zone: 'utc',
    }).toISODate();
    // --- BEGIN DEBUG LOGGING ---
    console.log(
      `[getHolidaysInRange] Querying for province: ${province}, range: ${startDateStr} to ${endDateStr}`,
    );
    // --- END DEBUG LOGGING ---

    const { data, error } = await supabaseServer
      .from('holidays')
      .select('*')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .or(`province.is.null,province.eq.${province}`);

    if (error) {
      console.error('[getHolidaysInRange] Error fetching holidays:', error);
      return [];
    }

    // --- BEGIN DEBUG LOGGING ---
    console.log(
      `[getHolidaysInRange] Raw data received for ${province} (${startDateStr}-${endDateStr}):`,
      JSON.stringify(data),
    );
    // --- END DEBUG LOGGING ---

    // Parse the JSON string 'type' back into string[]
    // Map and parse the type field, convert date string to Date object
    return (data || []).map(
      (h): HolidayWithTypeArray => ({
        ...h,
        date: new Date(h.date), // Convert date string to Date object
        type: safeJsonParse(h.type), // Parse JSON string to string[]
      }),
    );
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
  province: string,
  // Return type should reflect the parsed data structure using HolidayWithTypeArray
): Promise<HolidayWithTypeArray[]> {
  try {
    // Use the new helper
    const supabaseServer = await createAuthedServerClient();

    const startDate = DateTime.local(year, 1, 1).toISODate();
    const endDate = DateTime.local(year, 12, 31).toISODate();

    const { data, error } = await supabaseServer
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .or(`province.is.null,province.eq.${province}`);

    if (error) {
      console.error('Error fetching holidays:', error);
      return [];
    }

    // Parse the JSON string 'type' back into string[]
    // Map and parse the type field, convert date string to Date object
    return (data || []).map(
      (h): HolidayWithTypeArray => ({
        ...h,
        date: new Date(h.date), // Convert date string to Date object
        type: safeJsonParse(h.type), // Parse JSON string to string[]
      }),
    );
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
  province: string,
): Promise<void> {
  try {
    // Use the new helper
    const supabaseServer = await createAuthedServerClient();

    // First, delete existing holidays for this year and province
    const startDate = DateTime.local(year, 1, 1).toISODate();
    const endDate = DateTime.local(year, 12, 31).toISODate();

    // Delete national holidays for this year
    const { error: deleteNationalError } = await supabaseServer
      .from('holidays')
      .delete()
      .is('province', null)
      .gte('date', startDate)
      .lte('date', endDate);

    if (deleteNationalError) {
      console.error('Error deleting national holidays:', deleteNationalError);
    }

    // Delete provincial holidays for this year
    const { error: deleteProvincialError } = await supabaseServer
      .from('holidays')
      .delete()
      .eq('province', province)
      .gte('date', startDate)
      .lte('date', endDate);

    if (deleteProvincialError) {
      console.error(
        'Error deleting provincial holidays:',
        deleteProvincialError,
      );
    }

    // Insert new holidays - convert any Date objects to strings for Supabase
    if (holidays.length > 0) {
      // Map holidays to the insertion format: convert date and stringify type
      const holidaysToInsert = holidays
        .map((holiday) => {
          // Convert Date objects to ISO date strings
          let dateStr: string | null = null;
          if (typeof holiday.date === 'string') {
            // Attempt to parse and reformat to ensure consistency
            try {
              dateStr = DateTime.fromISO(holiday.date).toISODate();
            } catch {
              dateStr = null;
            } // Handle invalid string dates
          } else if (holiday.date instanceof Date) {
            dateStr = DateTime.fromJSDate(holiday.date).toISODate();
          }

          // Skip holidays with invalid dates
          if (!dateStr) {
            console.error(
              'Invalid or unparseable date for holiday:',
              holiday.name,
              holiday.date,
            );
            return null;
          }

          // Stringify the type array for database insertion
          const typeStr = JSON.stringify(holiday.type);

          return {
            // Return structure matching HolidayInsert (date: string, type: string)
            date: dateStr,
            name: holiday.name,
            province: holiday.province,
            type: typeStr, // Use the JSON stringified type
          };
        })
        // Filter out holidays that became null due to invalid dates
        .filter(
          (
            holiday,
            // Type predicate now matches the HolidayInsert structure
          ): holiday is {
            date: string;
            name: string;
            province: string | null;
            type: string; // Check type is string (JSON stringified)
          } => holiday !== null,
        );

      if (holidaysToInsert.length === 0) {
        console.warn('No valid holidays to insert after filtering');
        return;
      }

      const { error: insertError } = await supabaseServer
        .from('holidays')
        .insert(holidaysToInsert);

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
  province: string | null,
): Promise<boolean> {
  try {
    // Use the new helper
    const supabaseServer = await createAuthedServerClient();

    const dateStr = DateTime.fromJSDate(date).toISODate();

    if (!dateStr) {
      console.error('Invalid date for holiday check');
      return false;
    }

    let query = supabaseServer
      .from('holidays')
      .select('id')
      .eq('date', dateStr)
      .eq('name', name);

    if (province) {
      query = query.eq('province', province);
    }

    const { data, error } = await query;

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

// Get holidays for a specific year
export async function getHolidaysForYear(year: number, province: string) {
  try {
    // Define date range for the year
    const startDate = new Date(year, 0, 1); // January 1st of the year
    const endDate = new Date(year, 11, 31); // December 31st of the year

    // Get holidays in the date range
    return getHolidaysInRange(startDate, endDate, province);
  } catch (error) {
    console.error('Error fetching holidays for year:', error);
    return [];
  }
}

/**
 * Fetches and returns holidays from the database for a specific date range and province
 */
/**
 * Fetches and returns holidays from the database for a specific date range and province.
 * This function now directly uses getHolidaysInRange which handles parsing.
 */
export async function getHolidays(
  startDate: Date,
  endDate: Date,
  province: string,
): Promise<HolidayWithTypeArray[]> {
  // getHolidaysInRange already returns Promise<HolidayWithTypeArray[]>
  // with date as Date object and type as string[]
  return getHolidaysInRange(startDate, endDate, province);
}
