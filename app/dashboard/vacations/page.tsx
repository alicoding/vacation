import React from 'react';
import { getServerSession } from '@/lib/auth-helpers';
import { Box, Container, Typography, Button } from '@mui/material';
import VacationTable from '@/components/vacations/VacationTable';
import AddIcon from '@mui/icons-material/Add';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default async function VacationsPage() {
  // Middleware ensures we have a session, so we don't need the redirect check
  const session = await getServerSession();
  
  // Fetch vacations
  const { data: vacations } = await supabase
    .from('vacations')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('start_date', { ascending: false });
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Your Vacations
          </Typography>
          
          <Button
            component={Link}
            href="/dashboard/request"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Request Vacation
          </Button>
        </Box>
        
        <VacationTable vacations={vacations || []} />
      </Box>
    </Container>
  );
}