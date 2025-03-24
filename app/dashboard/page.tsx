import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
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
import { getVacationBalance } from '@/services/vacation/vacationService';

interface UserData {
  name: string | null;
  email: string | null;
  total_vacation_days: number;
  province: string;
  vacationBookings: VacationBooking[];
}

async function getUserData(userId: string): Promise<UserData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      total_vacation_days: true,
      province: true,
      vacationBookings: {
        select: {
          id: true,
          start_date: true,
          end_date: true,
          note: true,
          created_at: true,
          userId: true,
        },
        orderBy: {
          start_date: 'asc',
        },
      },
    },
  });
  
  return user;
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/auth/signin');
  }
  
  const user = await getUserData(session.user.id);
  
  if (!user) {
    redirect('/auth/signin');
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
  const province = user.province || 'ON';
  const vacationBalance = await getVacationBalance(session.user.id, province);
  
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