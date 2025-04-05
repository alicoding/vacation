'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Add useCallback
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
import { VacationBooking, Holiday, User } from '@/types'; // Use User type
import { calculateBusinessDays } from '@/services/vacation/vacationCalculationUtils'; // Import from utils

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
  // Remove vacations prop - will fetch client-side
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
  // vacations: initialVacations, // Removed prop
  holidaysError,
}: UpcomingVacationsCardProps) {
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [enhancedVacations, setEnhancedVacations] = useState<
    EnhancedVacation[]
  >([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true); // Start loading true
  const [province, setProvince] = useState<string | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vacations client-side on mount
  useEffect(() => {
    const getVacations = async () => {
      try {
        setLoading(true); // Ensure loading is true at start
        setError(null);
        const data = await fetchVacations(); // Use the existing fetch function
        setVacations(data);
      } catch (error) {
        console.error('Error fetching vacations client-side:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to load vacations',
        );
        setVacations([]); // Set empty array on error
      } finally {
        setLoading(false);
      }
    };

    void getVacations();
  }, []); // Empty dependency array ensures this runs only once on mount

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

  // Fetch user settings to get province
  useEffect(() => {
    const fetchSettings = async () => {
      setLoadingSettings(true);
      try {
        const response = await fetch('/api/user/settings');
        if (!response.ok) {
          throw new Error('Failed to fetch user settings');
        }
        const settings: User = await response.json(); // Use User type
        setProvince(settings.province || 'ON'); // Default to ON if not set
      } catch (err) {
        console.error('Error fetching user settings:', err);
        setError(
          err instanceof Error ? err.message : 'Could not load user province',
        );
        setProvince('ON'); // Default on error
      } finally {
        setLoadingSettings(false);
      }
    };
    void fetchSettings();
  }, []);

  // Effect to calculate enhanced vacations when data changes and loading is complete
  useEffect(() => {
    // Define the async calculation function directly inside the effect
    const performCalculation = () => {
      // Remove async
      console.log('[UpcomingVacationsCard] Running calculation effect...'); // Log effect run

      // Ensure all data is loaded and available
      if (loading || loadingSettings || !province || !vacations || !holidays) {
        console.log(
          '[UpcomingVacationsCard] Calculation skipped: Data not ready.',
          {
            loading,
            loadingSettings,
            province: !!province,
            vacations: vacations?.length,
            holidays: holidays?.length,
          },
        );
        return; // Don't run calculation if still loading or data missing
      }

      console.log(
        '[UpcomingVacationsCard] Data ready, proceeding with calculation.',
      );

      try {
        // Map asynchronously because calculateBusinessDays is async
        const enhancedResults = vacations.map(
          (vacation): EnhancedVacation | null => {
            // Remove async/Promise, rename variable
            console.log(
              `[UpcomingVacationsCard] Calculating for Vacation ID: ${vacation.id}, Start: ${vacation.start_date.toString()}, End: ${vacation.end_date.toString()}`,
            ); // Log start of calculation for specific vacation
            // Parse ISO strings directly using Luxon in UTC, ensuring start of day, to avoid timezone shifts
            const startDate = DateTime.fromISO(String(vacation.start_date), {
              zone: 'utc',
            })
              .startOf('day')
              .toJSDate();
            const endDate = DateTime.fromISO(String(vacation.end_date), {
              zone: 'utc',
            })
              .startOf('day')
              .toJSDate();

            // Calculate total days off (including weekends)
            const totalDaysOff = Interval.fromDateTimes(
              DateTime.fromJSDate(startDate),
              DateTime.fromJSDate(endDate).plus({ days: 1 }),
            ).length('days');

            // --- Calculate working days using the service ---
            let workingDaysOff = 0;
            try {
              // Convert the component's 'holidays' state (which are {id, date: string, ...})
              // to the { date: Date, type: string[] } format expected by calculateBusinessDays
              const holidaysForCalc: { date: Date; type: string[] }[] = holidays
                .map((h) => {
                  const dt = DateTime.fromISO(h.date, { zone: 'utc' });
                  return dt.isValid
                    ? { date: dt.toJSDate(), type: h.type || [] }
                    : null;
                })
                .filter((h): h is { date: Date; type: string[] } => h !== null);

              console.log(
                `[UpcomingVacationsCard] Passing ${holidaysForCalc.length} holidays to calculateBusinessDays for vacation ID ${vacation.id}`,
              ); // Log holidays passed
              // Call the synchronous function
              const calculatedDays = calculateBusinessDays(
                // Remove await
                startDate,
                endDate,
                holidaysForCalc, // Pass the formatted holidays array
                vacation.is_half_day || false, // Pass the actual half-day status
              );
              // Let the service handle the half-day logic based on the flag passed above
              workingDaysOff = Math.max(0, calculatedDays);
              console.log(
                `[UpcomingVacationsCard] Vacation ID: ${vacation.id} - Frontend calculated: ${calculatedDays}, Adjusted: ${workingDaysOff}`,
              ); // Log frontend result only
            } catch (calcError) {
              console.error(
                `Error calculating business days for vacation ${vacation.id}:`,
                calcError,
              );
              // Removed log referencing non-existent backend value
              return null;
            }
            // --- End working days calculation ---

            // --- Adjacency and message logic ---
            let isLongWeekend = false;
            let adjacentWeekend = false;
            let adjacentToHolidays = false;
            let extendedTimeOffMessage = null;
            const startDateTime = DateTime.fromJSDate(startDate);
            const endDateTime = DateTime.fromJSDate(endDate);
            const dayBeforeStart = startDateTime.minus({ days: 1 });
            const dayAfterEnd = endDateTime.plus({ days: 1 });
            const isWeekendDay = (date: DateTime) =>
              [6, 7].includes(date.weekday);

            if (isWeekendDay(dayBeforeStart) || isWeekendDay(dayAfterEnd)) {
              adjacentWeekend = true;
            }

            const adjacentHolidays = holidays.filter((holiday) => {
              const holidayDateStr = holiday.date;
              if (!holidayDateStr) return false;
              const holidayDateTime = DateTime.fromISO(holidayDateStr);
              return (
                holidayDateTime.hasSame(dayBeforeStart, 'day') ||
                holidayDateTime.hasSame(dayAfterEnd, 'day')
              );
            });

            if (adjacentHolidays.length > 0) {
              adjacentToHolidays = true;
            }

            // Calculate consecutive days off for message
            if (totalDaysOff <= 2 && (adjacentWeekend || adjacentToHolidays)) {
              isLongWeekend = true;
              let consecutiveDaysOff = totalDaysOff;
              if (adjacentWeekend) {
                if (isWeekendDay(dayBeforeStart))
                  consecutiveDaysOff +=
                    dayBeforeStart.weekday === 7
                      ? 2
                      : dayBeforeStart.weekday === 6
                        ? 2
                        : 0;
                if (isWeekendDay(dayAfterEnd))
                  consecutiveDaysOff +=
                    dayAfterEnd.weekday === 6
                      ? 2
                      : dayAfterEnd.weekday === 7
                        ? 1
                        : 0;
              }
              if (adjacentToHolidays)
                consecutiveDaysOff += adjacentHolidays.length;

              if (adjacentWeekend && adjacentToHolidays)
                extendedTimeOffMessage = `Extended break: ${consecutiveDaysOff} days off including weekends & holidays`;
              else if (adjacentWeekend)
                extendedTimeOffMessage = `Long weekend: ${consecutiveDaysOff} days off including weekend`;
              else if (adjacentToHolidays)
                extendedTimeOffMessage = `Extended break: ${consecutiveDaysOff} days off including holidays`;
            } else if (totalDaysOff > 2) {
              extendedTimeOffMessage = `Total time off: ${totalDaysOff} days (${workingDaysOff} working days)`;
            }

            // Determine vacation type
            let vacationType: 'regular' | 'long-weekend' | 'holiday-adjacent' =
              'regular';
            if (isLongWeekend) vacationType = 'long-weekend';
            else if (adjacentHolidays.length > 0)
              vacationType = 'holiday-adjacent';

            // Return the enhanced object
            return {
              ...vacation,
              isLongWeekend,
              adjacentHolidays,
              totalDaysOff,
              workingDaysOff,
              isHalfDay: vacation.is_half_day || false,
              halfDayPortion: vacation.half_day_portion as
                | 'AM'
                | 'PM'
                | undefined,
              vacationType,
              extendedTimeOffMessage,
            };
          },
        ); // End of vacations.map

        // Wait for all async map operations to complete
        const results = enhancedResults; // Remove await Promise.all, use the direct results
        // Filter out any null results from calculation errors
        const successfulEnhanced: EnhancedVacation[] = results.filter(
          (v): v is EnhancedVacation => v !== null,
        );
        // Sort and limit
        const sortedVacations = successfulEnhanced
          // Add explicit types for filter/sort parameters
          .filter(
            (vacation: EnhancedVacation) =>
              new Date(vacation.end_date) >= new Date(),
          )
          .sort(
            (a: EnhancedVacation, b: EnhancedVacation) =>
              new Date(a.start_date).getTime() -
              new Date(b.start_date).getTime(),
          );
        const limitedVacations = sortedVacations.slice(0, 5);

        // Only update state if the result is actually different (shallow compare stringified)
        // This helps prevent loops if dependencies change reference but not content
        if (
          JSON.stringify(limitedVacations) !== JSON.stringify(enhancedVacations)
        ) {
          console.log(
            '[UpcomingVacationsCard] Setting new enhanced vacations state.',
          );
          setEnhancedVacations(limitedVacations);
        } else {
          console.log(
            '[UpcomingVacationsCard] Enhanced vacations unchanged, skipping state update.',
          );
        }
        setError(null);
      } catch (err) {
        console.error('Error processing enhanced vacations:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to process vacation data',
        );
        setEnhancedVacations([]);
      }
    }; // End of performCalculation function definition

    // Call the calculation function
    performCalculation(); // Remove void

    // Dependencies: Run effect when data or loading states change
  }, [vacations, holidays, province, loading, loadingSettings]); // Re-run only when input data or loading state changes

  // Removed erroneous useEffect block that was calling a non-existent function

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
} // Closing parenthesis for the UpcomingVacationsCard component function
