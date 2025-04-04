export const runtime = 'edge';
import React from 'react';
import { getServerSession } from '@/lib/auth-helpers.server';
import { Box, Container, Typography, Paper, Card } from '@mui/material';
import { redirect } from 'next/navigation';
import { createDirectClient } from '@/lib/supabase.shared';
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
    .eq('user_id', session.user.id as any);
    
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
    .eq('id', session.user.id as any)
    .single();
  
  // Safely check if userProfile exists and has province property
  const userProvince = 
    userProfile && 'province' in userProfile ? 
      userProfile.province || 'ON' : 
      'ON'; // Default to Ontario if not set
  
  // If there are no vacations for this user, fetch all vacations (for testing)
  const allVacations = existingVacations && existingVacations.length > 0 ? 
    // Format existing vacations to ensure they match the expected type
    (existingVacations as any[]).map((vacation) => ({
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      is_half_day: vacation.is_half_day,
    })) : 
    // Try to fetch some sample vacations if none exist for this user
    await (async () => {
      const { data: testVacations } = await supabase
        .from('vacation_bookings')
        .select('start_date, end_date, is_half_day')
        .limit(5);
        
      if (testVacations && testVacations.length > 0) {
        console.log(`For testing, using ${testVacations.length} sample vacations`);
        return (testVacations as any[]).map((vacation) => ({
          start_date: vacation.start_date,
          end_date: vacation.end_date,
          is_half_day: vacation.is_half_day,
        }));
      }
      return [];
    })();
  
  // Map holidays to the expected structure for VacationForm component
  // This ensures type compatibility by explicitly mapping each required field
  const formattedHolidays = holidays ? 
    // First filter for valid holiday objects, then map to required format
    (holidays as any[])
      .filter((holiday) => 
        holiday && typeof holiday === 'object' && 
        'date' in holiday && 
        'name' in holiday && 
        'type' in holiday)
      .map((holiday) => ({
        date: holiday.date,
        name: holiday.name,
        province: holiday.province || null,
        type: holiday.type as 'bank' | 'provincial',
      })) 
    : [];
  
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
            holidays={formattedHolidays}
            existingVacations={allVacations || []}
          />
        </Card>
      </Box>
    </Container>
  );
}