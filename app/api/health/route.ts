import { NextResponse } from 'next/server';
import { createDirectClient } from '@/lib/supabase.server';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = createDirectClient();
    // Perform a simple query to check DB connection
    // Using 'vacations' table as suggested by project structure
    const { error } = await supabase
      .from('vacation_bookings') // Corrected table name based on TS error
      .select('id', { count: 'exact', head: true }) // Efficiently check table existence/access
      .limit(1);

    if (error) {
      console.error('Health check Supabase error:', error);
      return NextResponse.json(
        { status: 'error', message: `Supabase query failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    console.error('Health check unexpected error:', e);
    const message =
      e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
