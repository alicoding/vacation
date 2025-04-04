'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Alert,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DateTime, Interval } from 'luxon';
import Link from 'next/link';
import { VacationBooking, Holiday } from '@/types';

interface EnhancedVacation extends VacationBooking {
  isLongWeekend: boolean;
  adjacentHolidays: Holiday[];
  totalDaysOff: number;
  workingDaysOff: number;
  isHalfDay?: boolean;
  halfDayPortion?: 'AM' | 'PM';
  vacationType?: 'regular' | 'long-weekend' | 'holiday-adjacent';
  extendedTimeOffMessage: string | null;
}

interface UpcomingVacationsCardProps {
  vacations?: VacationBooking[];
  holidaysError?: string;
}

// Extracted function for fetching vacations
const fetchVacations = async (): Promise<VacationBooking[]> => {
  const response = await fetch('/api/vacations');
  if (!response.ok) throw new Error('Failed to fetch vacations');
  return await response.json();
};

// Extracted function for fetching holidays
const fetchHolidays = async (): Promise<Holiday[]> => {
  const response = await fetch('/api/holidays');
  if (!response.ok) throw new Error('Failed to fetch holidays');
  return await response.json();
};
export default function UpcomingVacationsCard({
  vacations: initialVacations,
  holidaysError,
}: UpcomingVacationsCardProps) {
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [enhancedVacations, setEnhancedVacations] = useState<
    EnhancedVacation[]
  >([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(!initialVacations);
  const [error, setError] = useState<string | null>(null);

  // Fetch vacations if not provided
  useEffect(() => {
    if (initialVacations) {
      setVacations(initialVacations);
      setLoading(false);
    } else {
      const getVacations = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchVacations();
          setVacations(data);
        } catch (error) {
          console.error('Error fetching vacations:', error);
          setError(
            error instanceof Error ? error.message : 'Failed to load vacations',
          );
        } finally {
          setLoading(false);
        }
      };

      void getVacations();
    }
  }, [initialVacations]);

  // Fetch holidays
  useEffect(() => {
    const getHolidays = async () => {
      try {
        const data = await fetchHolidays();
        setHolidays(data);
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    };

    void getHolidays();
  }, []);

  // Enhance vacations with additional information when vacations or holidays change
  useEffect(() => {
    if (vacations.length === 0 || holidays.length === 0) return;

    const enhanced = vacations.map((vacation) => {
      const startDate = new Date(vacation.start_date);
      const endDate = new Date(vacation.end_date);

      // Calculate total days off (including weekends)
      const totalDaysOff = Interval.fromDateTimes(
        DateTime.fromJSDate(startDate),
        DateTime.fromJSDate(endDate).plus({ days: 1 }),
      ).length('days');

      // Check if this is a long weekend
      // Long weekend is defined as:
      // - Taking 1-2 days off
      // - That connect with a weekend (either before or after)
      let isLongWeekend = false;
      let adjacentWeekend = false;
      let adjacentToHolidays = false;
      let extendedTimeOffMessage = null;

      // Check if vacation connects to a weekend
      const startDateTime = DateTime.fromJSDate(startDate);
      const endDateTime = DateTime.fromJSDate(endDate);
      const dayBeforeStart = startDateTime.minus({ days: 1 });
      const dayAfterEnd = endDateTime.plus({ days: 1 });

      const isWeekendDay = (date: DateTime) => [6, 7].includes(date.weekday);

      // Check if vacation is adjacent to weekend
      if (isWeekendDay(dayBeforeStart) || isWeekendDay(dayAfterEnd)) {
        adjacentWeekend = true;
      }

      // Find adjacent holidays
      const adjacentHolidays = holidays.filter((holiday) => {
        const holidayDateTime = DateTime.fromISO(holiday.date);

        // Check if holiday is directly before or after the vacation dates
        return (
          holidayDateTime.hasSame(dayBeforeStart, 'day') ||
          holidayDateTime.hasSame(dayAfterEnd, 'day')
        );
      });

      // Check if vacation is adjacent to holidays
      if (adjacentHolidays.length > 0) {
        adjacentToHolidays = true;
      }

      // Calculate working days (excluding weekends and holidays)
      let workingDaysOff = 0;
      let current = DateTime.fromJSDate(startDate);
      const lastDay = DateTime.fromJSDate(endDate);

      while (current <= lastDay) {
        if (![6, 7].includes(current.weekday)) {
          // Not a weekend
          const isHoliday = holidays.some((holiday) =>
            DateTime.fromISO(holiday.date).hasSame(current, 'day'),
          );

          if (!isHoliday) {
            workingDaysOff++;
          }
        }
        current = current.plus({ days: 1 });
      }

      // Create extended time off message if vacation connects to weekend or holiday
      if (totalDaysOff <= 2 && (adjacentWeekend || adjacentToHolidays)) {
        isLongWeekend = true;

        // Calculate the total consecutive days off (vacation + weekend + holidays)
        let consecutiveDaysOff = totalDaysOff;

        // Add weekend days if adjacent
        if (adjacentWeekend) {
          if (isWeekendDay(dayBeforeStart)) {
            // If the day before is Sunday (Luxon weekday 7), add 2 days (both Sat and Sun)
            if (dayBeforeStart.weekday === 7) {
              consecutiveDaysOff += 2;
            }
            // If the day before is Saturday (Luxon weekday 6), add 2 days (both Sat and Sun)
            else if (dayBeforeStart.weekday === 6) {
              consecutiveDaysOff += 2;
            }
          }
          if (isWeekendDay(dayAfterEnd)) {
            // If the day after is Saturday (Luxon weekday 6), add 2 days (both Sat and Sun)
            if (dayAfterEnd.weekday === 6) {
              consecutiveDaysOff += 2;
            }
            // If the day after is Sunday (Luxon weekday 7), add 1 day (just Sun)
            else if (dayAfterEnd.weekday === 7) {
              consecutiveDaysOff += 1;
            }
          }
        }

        // Add holiday days if adjacent
        if (adjacentToHolidays) {
          consecutiveDaysOff += adjacentHolidays.length;
        }

        // Create appropriate message
        if (adjacentWeekend && adjacentToHolidays) {
          extendedTimeOffMessage = `Extended break: ${consecutiveDaysOff} days off including weekends & holidays`;
        } else if (adjacentWeekend) {
          extendedTimeOffMessage = `Long weekend: ${consecutiveDaysOff} days off including weekend`;
        } else if (adjacentToHolidays) {
          extendedTimeOffMessage = `Extended break: ${consecutiveDaysOff} days off including holidays`;
        }
      } else if (totalDaysOff > 2) {
        // For longer vacations, calculate total time away
        extendedTimeOffMessage = `Total time off: ${totalDaysOff} days (${workingDaysOff} working days)`;
      }

      // Determine vacation type for color coding
      let vacationType: 'regular' | 'long-weekend' | 'holiday-adjacent' =
        'regular';
      if (isLongWeekend) {
        vacationType = 'long-weekend';
      } else if (adjacentHolidays.length > 0) {
        vacationType = 'holiday-adjacent';
      }

      // Include half-day information if available
      const isHalfDay = vacation.is_half_day || false;
      const halfDayPortion = vacation.half_day_portion as
        | 'AM'
        | 'PM'
        | undefined;

      return {
        ...vacation,
        isLongWeekend,
        adjacentHolidays,
        totalDaysOff,
        workingDaysOff,
        isHalfDay,
        halfDayPortion,
        vacationType,
        extendedTimeOffMessage,
      };
    });

    // Sort by start date (upcoming first)
    const sortedVacations = enhanced
      .filter((vacation) => new Date(vacation.end_date) >= new Date()) // Only show future or current vacations
      .sort(
        (a, b) =>
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );

    // Take at most 5 vacations to display on the dashboard
    // This ensures we show multiple cards if they exist, but not too many
    const limitedVacations = sortedVacations.slice(0, 5);

    setEnhancedVacations(limitedVacations);
  }, [vacations, holidays]);

  // Function to format a date range
  const formatDateRange = (
    startDate: string | Date,
    endDate: string | Date,
  ) => {
    try {
      // Convert to strings if they're Date objects
      const startStr =
        typeof startDate === 'string' ? startDate : startDate.toISOString();
      const endStr =
        typeof endDate === 'string' ? endDate : endDate.toISOString();

      const start = DateTime.fromISO(startStr);
      const end = DateTime.fromISO(endStr);

      // Check if dates are valid before formatting
      if (!start.isValid || !end.isValid) {
        console.warn('Invalid date detected:', {
          startDate,
          endDate,
          start,
          end,
        });
        return 'Date range unavailable';
      }

      // If same day, return single date
      if (start.hasSame(end, 'day')) {
        return start.toFormat('MMMM d, yyyy');
      }

      // If same month and year, return range with single month/year
      if (start.hasSame(end, 'month') && start.hasSame(end, 'year')) {
        return `${start.toFormat('MMMM d')} - ${end.toFormat('d, yyyy')}`;
      }

      // Otherwise, return full date range
      return `${start.toFormat('MMM d, yyyy')} - ${end.toFormat('MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date range:', error, {
        startDate,
        endDate,
      });
      return 'Date range unavailable';
    }
  };

  // Render error state
  if (error) {
    return (
      <Card elevation={0} variant="outlined">
        <CardHeader title="Upcoming Vacations" />
        <Divider />
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button
            onClick={() => window.location.reload()}
            variant="contained"
            color="error"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} variant="outlined">
      <CardHeader title="Upcoming Vacations" />
      <Divider />
      <CardContent>
        {holidaysError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {holidaysError}
          </Alert>
        )}

        <List disablePadding sx={{ maxHeight: '400px', overflow: 'auto' }}>
          {enhancedVacations.length > 0 ? (
            enhancedVacations.map((vacation) => (
              <React.Fragment key={vacation.id}>
                <ListItem
                  sx={{
                    py: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="medium">
                      {formatDateRange(
                        vacation.start_date.toString(),
                        vacation.end_date.toString(),
                      )}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${vacation.workingDaysOff} ${vacation.workingDaysOff === 1 ? 'day' : 'days'}`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>

                  {vacation.note && (
                    <Box mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        {vacation.note}
                      </Typography>
                    </Box>
                  )}

                  {vacation.isHalfDay && (
                    <Box mb={1}>
                      <Chip
                        size="small"
                        label={
                          vacation.halfDayPortion
                            ? `Half-day (${vacation.halfDayPortion})`
                            : 'Half-day'
                        }
                        color="secondary"
                        variant="outlined"
                      />
                    </Box>
                  )}

                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.5,
                      mt: 1,
                    }}
                  >
                    {vacation.vacationType === 'long-weekend' &&
                      vacation.extendedTimeOffMessage && (
                        <Chip
                          size="small"
                          label={vacation.extendedTimeOffMessage}
                          color="success"
                          variant="outlined"
                          sx={{ fontStyle: 'normal' }}
                        />
                      )}

                    {vacation.vacationType !== 'long-weekend' &&
                      vacation.extendedTimeOffMessage && (
                        <Chip
                          size="small"
                          label={vacation.extendedTimeOffMessage}
                          color="info"
                          variant="outlined"
                          sx={{ fontStyle: 'normal' }}
                        />
                      )}

                    {vacation.adjacentHolidays.length > 0 && (
                      <Box sx={{ width: '100%', mt: 0.5 }}>
                        {vacation.adjacentHolidays.map((holiday, idx) => (
                          <Chip
                            key={idx}
                            size="small"
                            label={`${holiday.name} (${DateTime.fromISO(holiday.date, { zone: 'utc' }).toFormat('MMM d')})`}
                            color="warning"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))
          ) : (
            <Box p={3} textAlign="center">
              <Typography variant="body1" color="text.secondary" gutterBottom>
                You have no upcoming vacations scheduled.
              </Typography>
            </Box>
          )}
        </List>
      </CardContent>
    </Card>
  );
}
