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
  Chip,
} from '@mui/material';
import useHolidays from '@/lib/hooks/useHolidays';
import { DateTime } from 'luxon';

interface HolidayOverviewCardProps {
  province: string;
  employmentType?: string;
}

export default function HolidayOverviewCard({
  province,
  employmentType = 'standard',
}: HolidayOverviewCardProps) {
  const currentYear = new Date().getFullYear();
  const { holidays, loading, error } = useHolidays(currentYear, province);

  // Filter holidays to show only upcoming ones
  const getUpcomingHolidays = () => {
    if (!holidays || holidays.length === 0) {
      console.log('[HolidayOverviewCard] No holidays available');
      return [];
    }

    console.log(
      '[HolidayOverviewCard] Filtering upcoming holidays from total:',
      holidays.length,
    );

    const today = DateTime.now().startOf('day');
    const sixMonthsFromNow = today.plus({ months: 6 });

    // Filter for upcoming holidays in the next 6 months
    const upcoming = holidays
      .filter((holiday) => {
        // Parse the date consistently using Luxon
        const holidayDate =
          typeof holiday.date === 'string'
            ? DateTime.fromISO(holiday.date).startOf('day')
            : DateTime.fromJSDate(holiday.date as Date).startOf('day');

        // Keep only future holidays within 6 months
        const isUpcoming =
          holidayDate >= today && holidayDate <= sixMonthsFromNow;

        // Apply employment type filter if needed
        const matchesType =
          employmentType === 'bank' ? holiday.type.includes('bank') : true;

        return isUpcoming && matchesType;
      })
      .sort((a, b) => {
        // Sort by date (ascending)
        const dateA =
          typeof a.date === 'string'
            ? DateTime.fromISO(a.date)
            : DateTime.fromJSDate(a.date as Date);

        const dateB =
          typeof b.date === 'string'
            ? DateTime.fromISO(b.date)
            : DateTime.fromJSDate(b.date as Date);

        return dateA.toMillis() - dateB.toMillis();
      });

    console.log(
      '[HolidayOverviewCard] Found upcoming holidays:',
      upcoming.length,
    );
    return upcoming;
  };

  const upcomingHolidays = getUpcomingHolidays();

  if (loading) {
    return (
      <Card>
        <CardContent
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
          }}
        >
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">Error loading holidays: {error}</Typography>
        </CardContent>
      </Card>
    );
  }

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
            {upcomingHolidays.slice(0, 5).map((holiday, index) => {
              // Parse date consistently with Luxon
              const holidayDate =
                typeof holiday.date === 'string'
                  ? DateTime.fromISO(holiday.date)
                  : DateTime.fromJSDate(holiday.date as Date);

              return (
                <React.Fragment key={holiday.id || index}>
                  {index > 0 && <Divider component="li" />}
                  <ListItem>
                    <ListItemText
                      primary={holiday.name}
                      secondary={
                        <>
                          {holidayDate.toFormat('MMMM dd, yyyy')}
                          <Chip
                            size="small"
                            label={
                              holiday.type.includes('bank')
                                ? 'Bank Holiday'
                                : 'Provincial'
                            }
                            color={
                              holiday.type.includes('bank') ? 'primary' : 'secondary'
                            }
                            sx={{ ml: 1, height: 20 }}
                          />
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
