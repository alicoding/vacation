export const runtime = 'edge';

import React from 'react';
import { getServerSession } from '@/lib/auth-helpers.server';
import { Box, Container, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import VacationList from '@/components/vacation/VacationList';
// Removed cookies from next/headers
// Removed createServerClient from @supabase/ssr
import { createSupabaseServerClient } from '@/lib/supabase-utils'; // Import the new utility
import { VacationBookingDb } from '@/services/vacation/vacationTypes'; // Import the DB type

export default async function VacationsPage() {
  // Middleware ensures we have a session, so we don't need the redirect check
  const session = await getServerSession();

  if (!session?.user?.id) {
    console.error('No session user ID found');
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1">
            Error: Not authenticated
          </Typography>
        </Box>
      </Container>
    );
  }

  // Use the createServerClient approach that works in dashboard page
  // Use the new utility function to create the Supabase client
  const supabase = await createSupabaseServerClient(); // Await the async function

  console.log('Fetching vacations for user ID:', session.user.id);

  // Fetch vacations using the same approach as dashboard page
  const { data, error } = await supabase
    .from('vacation_bookings')
    .select('*')
    .eq('user_id', session.user.id)
    .order('start_date', { ascending: false });

  // Explicitly type the fetched data using the shared DB type
  // Type inference should now work correctly with the fixed Database type
  const vacations = data || [];

  if (error) {
    console.error('Error fetching vacations:', error);
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1">
            Your Vacations
          </Typography>
          <Typography variant="body1" color="error" sx={{ mt: 2 }}>
            Error loading vacation data: {error.message}
          </Typography>
          <Button
            component={Link}
            href="/dashboard/vacations/new"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
          >
            Request Vacation
          </Button>
        </Box>
      </Container>
    );
  }

  console.log('Fetched vacations:', vacations.length);

  // Prepare data for VacationList, ensuring 'note' is undefined if null
  const vacationsForList = vacations.map((v) => ({
    // Add parentheses around 'v'
    ...v,
    note: v.note === null ? undefined : v.note,
    half_day_portion:
      v.half_day_portion === null ? undefined : v.half_day_portion,
    // Also handle google_event_id nullability
    google_event_id: v.google_event_id === null ? undefined : v.google_event_id,
    is_half_day: v.is_half_day === null ? undefined : v.is_half_day,
    created_at: v.created_at === null ? '' : v.created_at, // Handle null created_at
  }));

  // Removed unnecessary mapping, direct data should be compatible now

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
          }}
        >
          <Typography variant="h4" component="h1">
            Your Vacations
          </Typography>

          <Button
            component={Link}
            href="/dashboard/vacations/new"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Request Vacation
          </Button>
        </Box>

        {/* Pass the fetched data directly */}
        {/* Pass the mapped data to the component */}
        <VacationList vacations={vacationsForList} />
      </Box>
    </Container>
  );
}
