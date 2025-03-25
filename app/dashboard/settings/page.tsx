import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import UserSettings from '@/features/auth/UserSettings';
import HolidaySyncCard from '@/components/dashboard/HolidaySyncCard';
import { Typography, Container, Grid, Paper, Box } from '@mui/material';

async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      province: true,
      employment_type: true
    },
  });
  
  return {
    province: user?.province || 'ON',
    employmentType: user?.employment_type || 'standard'
  };
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect('/auth/signin');
  }
  
  const userSettings = await getUserSettings(session.user.id);
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Account Settings
        </Typography>
      </Box>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <UserSettings />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <HolidaySyncCard 
              userProvince={userSettings.province} 
              employmentType={userSettings.employmentType}
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 