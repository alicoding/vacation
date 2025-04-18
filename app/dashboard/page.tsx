export const runtime = 'edge';

// Remove import of server-side Supabase client
import VacationStatsCard from '@/components/dashboard/VacationStatsCard';
import UpcomingVacationsCard from '@/components/dashboard/UpcomingVacationsCard';
import Link from 'next/link';
import { Box, Typography, Grid, Paper, Container, Button } from '@mui/material';
import { VacationBooking, Holiday } from '@/types'; // Add Holiday type
// Remove getVacationDaysUsed import
import { getServerSession } from '@/lib/auth-helpers.server';
import type { Database } from '@/types/supabase';
import { calculateVacationStats } from '@/services/vacation/vacationCalculationUtils'; // Import centralized function
import {
  getHolidaysByYear,
  HolidayWithTypeArray,
} from '@/services/holiday/holidayService'; // Import getHolidaysByYear and HolidayWithTypeArray
import { DateTime } from 'luxon';
// Removed createServerClient from @supabase/ssr
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility

interface UserData {
  name: string | null;
  email: string | null;
  total_vacation_days: number;
  province: string;
  vacationBookings: VacationBooking[];
}

// Removed internal getEdgeCompatibleServerClient function
// Will use the shared createSupabaseServerClient utility instead

async function getUserData(userId: string): Promise<UserData | null> {
  try {
    // Use the centralized function for edge-compatible Supabase client
    const supabase = await createSupabaseServerClient(); // Use the new utility

    // Get user data directly from the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching user:', userError);
      return null;
    }

    // Try to get vacation bookings - handle case where table doesn't exist yet
    let vacationBookings: any[] = [];
    try {
      const { data, error } = await supabase
        .from('vacation_bookings')
        .select('*')
        .eq('user_id', userId);

      if (!error) {
        vacationBookings = data || [];
      } else if (error.code !== '42P01') {
        // Ignore table not exists error
        console.error('Error fetching vacation bookings:', error);
      }
    } catch (err) {
      console.warn('Could not fetch vacation bookings:', err);
    }

    return {
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email ?? null,
      total_vacation_days: user.user_metadata?.total_vacation_days || 20, // Default to 20
      province: user.user_metadata?.province || 'ON',
      vacationBookings:
        vacationBookings.map((booking: any) => ({
          id: booking.id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          note: booking.note,
          created_at: booking.created_at,
          userId: booking.user_id,
        })) || [],
    };
  } catch (error) {
    console.error('Error in getUserData:', error);
    return null;
  }
}

// Remove the old getVacationBalance function as it's replaced by calculateVacationStats

export default async function DashboardPage() {
  // Get user session
  const session = await getServerSession();

  // Trust that middleware has already handled authentication
  // If somehow we get here without a session, show a helpful message instead of redirecting
  if (!session || !session.user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Session Error
        </Typography>
        <Typography paragraph>
          Unable to verify your session. Please try signing in again.
        </Typography>
        <Button component={Link} href="/auth/signin" variant="contained">
          Sign In
        </Button>
      </Box>
    );
  }

  // Now safely use session.user.id since we've confirmed it exists
  const user = await getUserData(session.user.id);

  // Add null check for user as well
  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Error loading user data
        </Typography>
        <Typography>
          Your account information could not be loaded. Please try logging out
          and back in.
        </Typography>
      </Box>
    );
  }

  // Get upcoming vacations (only future ones, limited to 3)
  const upcomingVacations = user.vacationBookings
    .filter((vacation: VacationBooking) => {
      try {
        // Use Luxon for date manipulation with proper type handling
        const endDate =
          typeof vacation.end_date === 'string'
            ? DateTime.fromISO(vacation.end_date)
            : DateTime.fromJSDate(vacation.end_date);
        const now = DateTime.now();
        return endDate >= now;
      } catch (error) {
        console.error('Error parsing vacation end date:', error);
        return false; // Exclude vacations with invalid dates
      }
    })
    .sort((a: VacationBooking, b: VacationBooking) => {
      try {
        // Use Luxon for date comparison with proper type checking
        const aStartDate =
          typeof a.start_date === 'string'
            ? DateTime.fromISO(a.start_date)
            : DateTime.fromJSDate(a.start_date);

        const bStartDate =
          typeof b.start_date === 'string'
            ? DateTime.fromISO(b.start_date)
            : DateTime.fromJSDate(b.start_date);

        return aStartDate.toMillis() - bStartDate.toMillis();
      } catch (error) {
        console.error('Error sorting vacation dates:', error);
        return 0; // Keep original order if date parsing fails
      }
    })
    .slice(0, 3);

  // Fetch holidays for the user's province (or default)
  const province = user.province || 'ON'; // Use fetched province or default
  let holidays: HolidayWithTypeArray[] = []; // Use the correct type from holidayService
  try {
    // Fetch holidays for the current year using getHolidaysByYear
    const currentYear = DateTime.now().year;
    holidays = await getHolidaysByYear(currentYear, province); // Correct function call
  } catch (error) {
    console.error(`Error fetching holidays for province ${province}:`, error);
    // Proceed without holidays if fetching fails, stats might be less accurate
  }

  // Calculate vacation stats using the centralized function
  const vacationStats = calculateVacationStats(
    // Add await here
    user.total_vacation_days, // Use total days from user data
    user.vacationBookings, // Use bookings from user data
    holidays, // Use fetched holidays
  );

  return (
    <Box component="main" sx={{ py: 3 }}>
      <Container>
        <Box mb={4}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Welcome back, {user?.name || 'User'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your vacations and time off easily
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <VacationStatsCard stats={vacationStats} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Quick Actions</Typography>
              </Box>

              <Typography variant="body2" mb={2} color="text.secondary">
                What would you like to do today?
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  component={Link}
                  href="/dashboard/vacations"
                  fullWidth
                >
                  Request Vacation
                </Button>

                <Button
                  variant="outlined"
                  component={Link}
                  href="/dashboard/calendar"
                  fullWidth
                >
                  View Calendar
                </Button>

                <Button
                  variant="outlined"
                  component={Link}
                  href="/dashboard/settings"
                  fullWidth
                >
                  Update Settings
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <UpcomingVacationsCard />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
