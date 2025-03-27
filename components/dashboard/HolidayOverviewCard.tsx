'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import useHolidays, { Holiday } from '@/lib/hooks/useHolidays';
import { DateTime } from 'luxon';
import { fetchHolidays, Holiday as ClientHoliday } from '@/lib/client/holidayClient';

interface HolidayOverviewCardProps {
  province: string;
  employmentType?: string;
}

export default function HolidayOverviewCard({ province, employmentType = 'standard' }: HolidayOverviewCardProps) {
  const currentYear = new Date().getFullYear();
  const { holidays, loading, error } = useHolidays(currentYear, province);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    const fetchUpcomingHolidays = async () => {
      try {
        const today = DateTime.now();
        const sixMonthsFromNow = today.plus({ months: 6 });
        
        // Use the fetchHolidays function with correct arguments
        const holidays = await fetchHolidays(
          today.toJSDate(), 
          sixMonthsFromNow.toJSDate(), 
          province
        );
        
        // Filter holidays based on employment type if needed
        const filteredHolidays = employmentType === 'bank' 
          ? holidays.filter(h => h.type === 'bank') 
          : holidays;
        
        setUpcomingHolidays(filteredHolidays as unknown as Holiday[]);
      } catch (error) {
        console.error('Error fetching upcoming holidays:', error);
      }
    };
    
    fetchUpcomingHolidays();
  }, [province, employmentType]);

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">
            Error loading holidays: {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Rest of the component rendering
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upcoming Holidays
        </Typography>
        
        {upcomingHolidays.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No upcoming holidays in the next 6 months.
          </Typography>
        ) : (
          <List>
            {upcomingHolidays.slice(0, 5).map((holiday, index) => (
              <React.Fragment key={holiday.id}>
                {index > 0 && <Divider component="li" />}
                <ListItem>
                  <ListItemText
                    primary={holiday.name}
                    secondary={
                      <>
                        {DateTime.fromISO(holiday.date).toFormat('MMMM dd, yyyy')}
                        <Chip 
                          size="small" 
                          label={holiday.type}
                          color={holiday.type === 'bank' ? 'primary' : 'secondary'}
                          sx={{ ml: 1, height: 20 }}
                        />
                      </>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}