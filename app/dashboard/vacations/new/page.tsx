export const runtime = 'edge';
import React from 'react';
import { getServerSession } from '@/lib/auth-helpers';
import { Box, Container, Typography, Paper, Card } from '@mui/material';
import { redirect } from 'next/navigation';
import { createDirectClient } from '@/utils/supabase';
import VacationForm from '@/components/vacation/VacationForm';

export default async function NewVacationPage() {
  // Ensure we have a session
  const session = await getServerSession();
  
  if (!session) {
    redirect('/auth/signin');
  }
  
  // Use the direct client for edge compatibility
  const supabase = createDirectClient();
  
  // Fetch holidays for current year
  const currentYear = new Date().getFullYear();
  const { data: holidays, error: holidaysError } = await supabase
    .from('holidays')
    .select('*')
    .gte('date', `${currentYear}-01-01`)
    .lte('date', `${currentYear}-12-31`);
    
  if (holidaysError) {
    console.error('Error fetching holidays:', holidaysError);
  }
  
  // Fetch existing vacations for the user to prevent booking conflicts
  const { data: existingVacations, error: vacationsError } = await supabase
    .from('vacation_bookings')
    .select('start_date, end_date, is_half_day')
    .eq('user_id', session.user.id);
    
  if (vacationsError) {
    console.error('Error fetching existing vacations:', vacationsError);
  }
  
  // Debug the existing vacations data
  console.log('Existing vacations:', 
    existingVacations ? 
      `Found ${existingVacations.length} vacations` : 
      'No existing vacations found');
  
  // Fetch user province for holiday filtering
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('province')
    .eq('id', session.user.id)
    .single();
  
  const userProvince = userProfile?.province || 'ON'; // Default to Ontario if not set
  
  // If there are no vacations for this user, fetch all vacations (for testing)
  let allVacations = existingVacations;
  if (!existingVacations || existingVacations.length === 0) {
    // For testing purposes, fetch some other vacations to ensure display works
    const { data: testVacations } = await supabase
      .from('vacation_bookings')
      .select('start_date, end_date, is_half_day')
      .limit(5);
      
    if (testVacations && testVacations.length > 0) {
      console.log(`For testing, using ${testVacations.length} sample vacations`);
      allVacations = testVacations;
    }
  }
  
  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
          Request Vacation
        </Typography>
        
        <Card variant="outlined" sx={{ p: 3 }}>
          <VacationForm 
            userId={session.user.id}
            province={userProvince}
            holidays={holidays || []}
            existingVacations={allVacations || []}
          />
        </Card>
      </Box>
    </Container>
  );
}