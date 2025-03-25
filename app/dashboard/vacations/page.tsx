import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { redirect } from 'next/navigation';
import VacationForm from '@/components/vacation/VacationForm';
import VacationList from '@/components/vacation/VacationList';
import { getVacationBookings } from '@/services/vacation/vacationService';
import { getHolidays } from '@/services/holiday/holidayService';
import { Container, Typography, Grid, Paper, Box, Divider } from '@mui/material';

export default async function VacationsPage() {
  // Get user session
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/auth/signin');
  }
  
  // Get user's vacation bookings
  const vacations = await getVacationBookings(session.user.id);
  
  // Get holidays for the current year for the user's province
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);
  
  const province = session.user.province || 'ON';
  const holidays = await getHolidays(startOfYear, endOfYear, province);
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Vacations
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Book and manage your vacation days
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        {/* Vacation Form */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Book New Vacation
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <VacationForm 
              userId={session.user.id} 
              province={province}
              holidays={holidays}
            />
          </Paper>
        </Grid>
        
        {/* Vacation List */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight="medium" gutterBottom>
              Your Vacations
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <VacationList 
              vacations={vacations} 
              holidays={holidays}
              province={province}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 