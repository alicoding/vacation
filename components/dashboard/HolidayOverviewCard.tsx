"use client";

import React from 'react';
import { DateTime } from 'luxon';
import { 
  CircularProgress, 
  Paper, 
  Typography, 
  Box, 
  Divider,
  Chip
} from '@mui/material';
import useHolidays, { Holiday } from '@/lib/hooks/useHolidays';

interface HolidayOverviewCardProps {
  province: string;
}

const HolidayOverviewCard: React.FC<HolidayOverviewCardProps> = ({ province }) => {
  const today = DateTime.now();
  const sixMonthsFromNow = today.plus({ months: 6 });
  
  // Use our custom hook to fetch holidays
  const { holidays, loading, error } = useHolidays(today.toJSDate(), sixMonthsFromNow.toJSDate(), province);
  
  // Filter for upcoming holidays only
  const upcomingHolidays = holidays
    .filter(holiday => DateTime.fromISO(holiday.date) > today)
    .sort((a, b) => DateTime.fromISO(a.date).toMillis() - DateTime.fromISO(b.date).toMillis())
    .slice(0, 5); // Show only the next 5 holidays

  // Get holiday badge color based on type
  const getHolidayBadgeColor = (type: Holiday['type']) => {
    return type === 'bank' ? 'warning' : 'secondary';
  };

  // Get holiday badge text based on type
  const getHolidayBadgeText = (type: Holiday['type']) => {
    return type === 'bank' ? 'Bank Holiday' : 'Provincial';
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 3, 
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 2
      }}
    >
      <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 500 }}>
        Upcoming Holidays
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : upcomingHolidays.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">No upcoming holidays found</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcomingHolidays.map((holiday) => (
            <Paper 
              key={holiday.id} 
              variant="outlined" 
              sx={{ p: 2, borderRadius: 1 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {holiday.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {DateTime.fromISO(holiday.date).toFormat('EEEE, MMMM d, yyyy')}
                  </Typography>
                </Box>
                
                <Chip
                  label={getHolidayBadgeText(holiday.type)}
                  color={getHolidayBadgeColor(holiday.type)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Paper>
          ))}
        </Box>
      )}
      
      <Divider sx={{ mt: 3, mb: 2 }} />
      
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: 'warning.main' 
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            Bank Holiday (non-bookable)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              bgcolor: 'secondary.main' 
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            Provincial Holiday (informational)
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default HolidayOverviewCard;