export const runtime = 'edge';

import React from 'react';
import { getServerSession } from '@/lib/auth-helpers.server';
import { Box, Container, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import VacationList from '@/components/vacation/VacationList';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

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
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Fix: Need to await the cookie store
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          cookieStore.set(name, value, options);
        },
        remove(name, options) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    },
  );
  
  console.log('Fetching vacations for user ID:', session.user.id);
  
  // Fetch vacations using the same approach as dashboard page
  const { data: vacations, error } = await supabase
    .from('vacation_bookings')
    .select('*')
    .eq('user_id', session.user.id)
    .order('start_date', { ascending: false });
  
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
  
  console.log('Fetched vacations:', vacations?.length || 0);
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
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
        
        <VacationList vacations={vacations || []} />
      </Box>
    </Container>
  );
}