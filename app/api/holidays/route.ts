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
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { getHolidays } from '@/services/holiday/holidayService';

/**
 * GET /api/holidays
 * Fetch holiday information for a given date and province
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') 
      ? parseInt(searchParams.get('year')!) 
      : new Date().getFullYear();
    
    // Get the province from search params or the user's profile
    let province = searchParams.get('province');
    let employmentType = searchParams.get('employment_type');
    
    if (!province || !employmentType) {
      // Get user's province and employment type from database if not specified
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });
      
      if (!province) {
        province = user?.province || 'ON';
      }
      
      if (!employmentType) {
        // @ts-ignore - employment_type exists in the database schema
        employmentType = user?.employment_type || 'standard';
      }
    }
    
    // Get holiday type filter if provided
    const holidayType = searchParams.get('type');

    // Fetch all holidays for the specified year and province
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const endOfYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    
    const whereClause: any = {
      date: {
        gte: startOfYear,
        lte: endOfYear,
      },
      OR: [
        { province: null }, // National holidays
        { province }, // Province-specific holidays
      ]
    };
    
    // Apply holiday type filter if specified
    if (holidayType) {
      whereClause.type = holidayType;
    }
    
    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    // Create a map to identify and remove duplicates (same date and name)
    const uniqueHolidays = new Map();
    
    holidays.forEach(holiday => {
      const dateStr = holiday.date.toISOString().split('T')[0];
      const key = `${dateStr}-${holiday.name}`;
      
      // For duplicates, prefer province-specific over national
      if (!uniqueHolidays.has(key) || 
          (holiday.province && !uniqueHolidays.get(key).province)) {
        uniqueHolidays.set(key, holiday);
      }
    });

    // Format dates consistently for client/server hydration
    const formattedHolidays = Array.from(uniqueHolidays.values()).map(holiday => {
      // Determine if holiday applies based on employment type
      let appliesTo = false;
      
      if (holiday.type === 'bank') {
        // Bank holidays apply to bank staff and standard employees
        appliesTo = employmentType === 'bank' || employmentType === 'standard';
      } else if (holiday.type === 'provincial') {
        // Provincial holidays apply to standard employees
        appliesTo = employmentType === 'standard';
      }
      
      // For federal employees, all federal holidays apply
      if (employmentType === 'federal') {
        // We're considering all holidays with province=null as federal holidays
        appliesTo = holiday.province === null;
      }
      
      // FIX: Use UTC version of the date to prevent timezone offset issues
      const dateObj = holiday.date;
      const utcDate = new Date(Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate()
      ));
      
      return {
        ...holiday,
        date: utcDate.toISOString(), // Use the UTC ISO string
        // Add a display property to show if this is a bank or general holiday
        displayType: holiday.type === 'bank' ? 'Bank Holiday' : 'General Holiday',
        // Add a boolean flag to indicate if this holiday applies to the user
        appliesTo,
        // Add relevance indicator based on employment type
        relevantToEmploymentType: appliesTo
      };
    });

    return NextResponse.json(formattedHolidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/holidays
 * Force sync holidays for a specific year
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get year from request body
    const data = await request.json();
    const year = data.year || new Date().getFullYear();
    
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