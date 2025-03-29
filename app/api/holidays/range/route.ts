export const runtime = 'edge';
/**
 * @description This API endpoint handles the retrieval of holidays within a specified date range and province.
 * It expects a POST request with a JSON body containing the startDate, endDate, and province.
 * @param {NextRequest} request - The Next.js request object containing the startDate, endDate, and province in the body.
 * @returns {Promise<NextResponse>} - A promise that resolves to a NextResponse object.
 * On success, it returns a JSON response containing an array of holidays.
 * On failure, it returns a JSON response with an error message and a corresponding HTTP status code.
 * @throws {Error} - Throws an error if any of the required parameters (startDate, endDate, province) are missing,
 * or if there is an error during the holiday fetching process.
 */
import { NextResponse } from 'next/server';
import { getHolidays } from '@/services/holiday/holidayService';

export async function POST(request: Request) {
  try {
    const { startDate, endDate, province } = await request.json();
    
    if (!startDate) {
      return NextResponse.json(
        { error: 'startDate parameter is required' },
        { status: 400 },
      );
    }
    
    if (!endDate) {
      return NextResponse.json(
        { error: 'endDate parameter is required' },
        { status: 400 },
      );
    }
    
    if (!province) {
      return NextResponse.json(
        { error: 'province parameter is required' },
        { status: 400 },
      );
    }
    
    const holidays = await getHolidays(new Date(startDate), new Date(endDate), province);
    return NextResponse.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: 'Failed to fetch holidays', details: String(error) },
      { status: 500 },
    );
  }
}
