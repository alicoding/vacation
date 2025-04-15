import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/utils/supabase-api';
import {
  getHolidays,
  getHolidaysForYear,
  syncHolidaysForYear,
} from '@/services/holiday/holidayService';

export const runtime = 'edge';

/**
 * @module HolidaysAPI
 */

/**
 * @typedef Holiday
 * @property {string} id - The unique identifier for the holiday.
 * @property {Date} date - The date of the holiday.
 * @property {string} name - The name of the holiday.
 * @property {string | null} province - The province the holiday applies to, or null if it's a national holiday.
 * @property {string} type - The type of holiday (e.g., 'bank', 'general').
 * @property {string} displayType - A user-friendly display type for the holiday (e.g., 'Bank Holiday', 'General Holiday').
 * @property {boolean} appliesTo - Indicates whether the holiday applies to the current user based on their province.
 */

/**
 * @function GET
 * @description Fetches holiday information for a given year and province.
 * @param {NextRequest} request - The Next.js request object, containing URL parameters for year and province.
 * @returns {Promise<NextResponse>} - A promise that resolves to a Next.js response containing an array of Holiday objects or an error message.
 *
 * @throws {401} - If the user is not authenticated.
 * @throws {500} - If there is a server error during the holiday fetching process.
 *
 * @example
 * // Example usage:
 * // Fetch holidays for the year 2024 in Ontario:
 * // GET /api/holidays?year=2024&province=ON
 */

/**
 * @function POST
 * @description Forces a sync of holidays for a specific year (implementation detail: currently only returns a success message).
 * @param {NextRequest} request - The Next.js request object, containing the year in the request body.
 * @returns {Promise<NextResponse>} - A promise that resolves to a Next.js response indicating the success or failure of the holiday sync.
 *
 * @throws {401} - If the user is not authenticated.
 * @throws {500} - If there is a server error during the holiday syncing process.
 *
 * @example
 * // Example usage:
 * // Sync holidays for the year 2025:
 * // POST /api/holidays with body { year: 2025 }
 */

/**
 * @function fetchHolidays
 * @description Fetches holidays based on a date range and province using the holidayService.
 * @param {Request} request - The request object containing startDate, endDate, and province in the body.
 * @returns {Promise<NextResponse>} - A promise that resolves to a Next.js response containing an array of Holiday objects or an error message.
 * @throws {400} - If startDate, endDate, or province are missing in the request body.
 *
 * @example
 * // Example usage:
 * // Fetch holidays between 2024-01-01 and 2024-12-31 in Alberta:
 * // POST /api/holidays with body { startDate: '2024-01-01', endDate: '2024-12-31', province: 'AB' }
 */

/**
 * GET /api/holidays
 * Returns a list of holidays filtered by province and year
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createApiClient();

    // Use getUser() for better security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the year from the query parameters, default to current year
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Get user's province from user metadata instead of the users table
    const userProvince = user.user_metadata?.province || 'ON'; // Default to Ontario
    const employmentType = user.user_metadata?.employment_type || 'standard'; // Default to standard

    try {
      // Use the service function instead of direct database query
      let holidays = await getHolidaysForYear(year, userProvince); // Returns HolidayWithTypeArray[]

      // Log the retrieved holidays before filtering
      console.log(
        `Retrieved ${holidays.length} holidays for year ${year}, province ${userProvince} before filtering for employment type ${employmentType}`,
      );

      // Filter holidays based on employment type
      holidays = holidays.filter((holiday) => {
        // Always include 'Public' holidays
        if (holiday.type.includes('Public')) {
          return true;
        }
        // Include 'Bank' holidays for 'bank' employees
        if (employmentType === 'bank' && holiday.type.includes('Bank')) {
          return true;
        }
        // Include 'Federal' holidays for 'federal' employees (assuming 'Federal' is a type)
        // Adjust 'Federal' if the Nager API uses a different term
        if (employmentType === 'federal' && holiday.type.includes('Federal')) {
          return true;
        }
        // Add other type checks if necessary (e.g., 'Optional', 'Observance')

        return false; // Exclude if none of the conditions match
      });

      // Log after filtering
      console.log(
        `Returning ${holidays.length} holidays after filtering for employment type ${employmentType}`,
      );

      // If no holidays found, try to sync from external API
      if (!holidays || holidays.length === 0) {
        console.log(`No holidays found, syncing for year ${year}`);
        await syncHolidaysForYear(year);

        // Try fetching again after sync
        let syncedHolidays = await getHolidaysForYear(year, userProvince);
        // Apply filtering to synced holidays as well
        syncedHolidays = syncedHolidays.filter((holiday) => {
          if (holiday.type.includes('Public')) return true;
          if (employmentType === 'bank' && holiday.type.includes('Bank'))
            return true;
          if (employmentType === 'federal' && holiday.type.includes('Federal'))
            return true;
          return false;
        });
        return NextResponse.json(syncedHolidays || []);
      }

      // Return the holidays
      return NextResponse.json(holidays || []);
    } catch (serviceError: unknown) {
      console.error('Service error fetching holidays:', serviceError);

      // Fallback to direct database query if the service fails
      try {
        const startDate = new Date(year, 0, 1); // January 1st
        const endDate = new Date(year, 11, 31); // December 31st

        let holidaysQuery = supabase
          .from('holidays')
          .select('*')
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0]);

        if (userProvince !== 'ALL') {
          holidaysQuery = holidaysQuery.or(
            `province.eq.${userProvince},province.is.null`,
          );
        }

        const { data: holidays, error } = await holidaysQuery;

        if (error) {
          console.error('Error in fallback holiday fetch:', error);
          return NextResponse.json([]);
        }

        return NextResponse.json(holidays || []);
      } catch (dbError: unknown) {
        console.error('Database error fetching holidays:', dbError);
        // Return empty array to prevent frontend from breaking
        return NextResponse.json([]);
      }
    }
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/holidays
 * Force sync holidays for a specific year
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createApiClient();

    // Use getUser() for better security
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get year from request body
    const { year }: { year: number } = await request.json();

    if (!year) {
      return NextResponse.json({ error: 'Year is required' }, { status: 400 });
    }

    // Actually perform the sync operation from external API
    try {
      await syncHolidaysForYear(year);

      // Return success response with count of synced holidays
      const province = user.user_metadata?.province || 'ON';
      const holidays = await getHolidaysForYear(year, province);

      return NextResponse.json({
        success: true,
        message: `${holidays.length} holidays for ${year} synced successfully`,
      });
    } catch (syncError) {
      console.error('Error syncing holidays:', syncError);
      return NextResponse.json(
        { error: 'Failed to sync holidays', details: String(syncError) },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('Error syncing holidays:', error);
    return NextResponse.json(
      { error: 'Failed to sync holidays', details: String(error) },
      { status: 500 },
    );
  }
}
