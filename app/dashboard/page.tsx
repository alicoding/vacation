export const runtime = 'edge';

import { supabase } from '@/lib/supabase';
import VacationStatsCard from '@/components/dashboard/VacationStatsCard';
import UpcomingVacationsCard from '@/components/dashboard/UpcomingVacationsCard';
import HolidayOverviewCard from '@/components/dashboard/HolidayOverviewCard';
import HolidaySyncCard from '@/components/dashboard/HolidaySyncCard';
import Link from 'next/dist/client/app-dir/link';
import { 
  Box, Typography, Grid, Paper, Container, Button 
} from '@mui/material';
import { VacationBooking } from '@/types';
import { DateTime, Interval } from 'luxon';
import { getHolidays } from '@/services/holiday/holidayService';
import { getVacationDaysUsed } from '@/services/vacation/vacationService';
import { getServerSession } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

interface UserData {
  name: string | null;
  email: string | null;
  total_vacation_days: number;
  province: string;
  vacationBookings: VacationBooking[];
}

async function getUserData(userId: string): Promise<UserData | null> {
  try {
    // Get user data from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
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
      } else if (error.code !== '42P01') { // Ignore table not exists error
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
      vacationBookings: vacationBookings.map((booking: any) => ({
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

// Update the getVacationBalance function to match the table structure
async function getVacationBalance(userId: string, province: string) {
  // Get current year
  const currentYear = new Date().getFullYear();
  
  // Get used vacation days for current year
  const usedDays = await getVacationDaysUsed(userId, currentYear);
  
  // Get user's total vacation days from their metadata
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
  
  if (userError) {
    console.error('Error fetching user data for vacation balance:', userError);
  }
  
  const totalDays = user?.user_metadata?.total_vacation_days || 20; // Default to 20 days
  
  // Calculate remaining days
  const remainingDays = Math.max(0, totalDays - usedDays);
  
  return {
    total: totalDays,
    used: usedDays,
    remaining: remainingDays
  };
}

export default async function DashboardPage() {
  // Get user session
  const session = await getServerSession();
  
  // Check if session exists - add this protection as a fallback
  if (!session || !session.user) {
    redirect('/auth/signin');
    return null; // This line is never reached, but helps TypeScript
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
          Your account information could not be loaded. Please try logging out and back in.
        </Typography>
      </Box>
    );
  }
  
  // Get upcoming vacations (only future ones, limited to 3)
  const upcomingVacations = user.vacationBookings
    .filter((vacation: VacationBooking) => {
      try {
        const endDate = new Date(vacation.end_date);
        return endDate >= new Date();
      } catch (error) {
        console.error('Error parsing vacation end date:', error);
        return false; // Exclude vacations with invalid dates
      }
    })
    .sort((a: VacationBooking, b: VacationBooking) => { 
      try {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      } catch (error) {
        console.error('Error sorting vacation dates:', error);
        return 0; // Keep original order if date parsing fails
      }
    })
    .slice(0, 3);
  
  // Get vacation balance using the service that properly accounts for holidays
  const province = user!.province || 'ON';
  const vacationBalance = await getVacationBalance(session!.user.id, province);
  
  // Define vacationStats with appropriate values from the service
  const vacationStats = {
    total: vacationBalance.total,
    used: vacationBalance.used,
    remaining: vacationBalance.remaining
  };
  
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
              sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Quick Actions</Typography>
              </Box>
              
              <Typography variant="body2" mb={2} color="text.secondary">
                What would you like to do today?
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Button 
                  variant="contained" 
                  component={Link} 
                  href="/dashboard/request" 
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
            <UpcomingVacationsCard vacations={upcomingVacations} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}