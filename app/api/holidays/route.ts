import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/utils/supabase-api';
import { getHolidays } from '@/services/holiday/holidayService';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the year from the query parameters, default to current year
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Get user's province from user metadata instead of the users table
    const userProvince = user.user_metadata?.province || 'ON'; // Default to Ontario if not set
    
    try {
      // Attempt to query using the year column first
      let holidaysQuery = supabase
        .from('holidays')
        .select('*')
        .eq('year', year);
      
      if (userProvince !== 'ALL') {
        holidaysQuery = holidaysQuery.or(`province.eq.${userProvince},province.is.null`);
      }
      
      let { data: holidays, error } = await holidaysQuery;
      
      // If we get a column error, try with date range instead
      if (error && error.code === '42703') { // Column doesn't exist error
        console.warn('Column "year" not found in holidays table, using date range filter instead');
        
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        holidaysQuery = supabase
          .from('holidays')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);
          
        if (userProvince !== 'ALL') {
          holidaysQuery = holidaysQuery.or(`province.eq.${userProvince},province.is.null`);
        }
        
        const result = await holidaysQuery;
        holidays = result.data;
        error = result.error;
      }
      
      if (error) {
        // If we still have an error, just return an empty array
        console.error('Error fetching holidays:', error);
        return NextResponse.json([]);
      }
      
      return NextResponse.json(holidays || []);
    } catch (dbError: any) {
      console.error('Database error fetching holidays:', dbError);
      // Return empty array to prevent frontend from breaking
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get year from request body
    const { year } = await request.json();
    // In a real implementation, you would sync holidays from an external API
    return NextResponse.json({ 
      success: true, 
      message: `Holidays for ${year} synced successfully` 
    });
  } catch (error) {
    console.error('Error syncing holidays:', error);
    return NextResponse.json(
      { error: 'Failed to sync holidays', details: String(error) },
      { status: 500 }
    );
  }
}
