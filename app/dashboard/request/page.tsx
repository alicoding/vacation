'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Box, Typography, Paper, Container, Grid, TextField,
  Button, Alert, Stack, Snackbar, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { DateTime, Interval } from 'luxon';
import { Holiday } from '@/types';
import { styled } from '@mui/material/styles';

// Custom styled day component for the date picker
const StyledDay = styled(PickersDay)(({ theme }) => ({
  '&.holiday-day': {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
    '&:hover': {
      backgroundColor: theme.palette.error.main,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
  },
  '&.bank-holiday': {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  },
  '&.provincial-holiday': {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  }
}));

export default function RequestVacationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState<DateTime | null>(null);
  const [endDate, setEndDate] = useState<DateTime | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [daysCount, setDaysCount] = useState(0);

  // Fetch holidays when component mounts
  useEffect(() => {
    async function fetchHolidays() {
      try {
        const res = await fetch('/api/holidays');
        if (res.ok) {
          const data = await res.json();
          setHolidays(data);
        }
      } catch (error) {
        console.error('Error fetching holidays:', error);
      }
    }
    
    fetchHolidays();
  }, []);

  // Helper function to check if a date is a weekend
  const isWeekend = (date: DateTime) => {
    return date.weekday > 5; // 6 = Saturday, 7 = Sunday in Luxon
  };

  // Calculate business days between dates, excluding weekends and holidays
  const calculateBusinessDays = (start: DateTime, end: DateTime) => {
    if (!start || !end) return 0;
    
    let count = 0;
    let current = start.startOf('day');
    const endDate = end.startOf('day');
    
    // Convert holidays to normalized strings for easier comparison
    const holidayDates = holidays.map(h => 
      DateTime.fromISO(h.date).toISODate()
    );
    
    while (current <= endDate) {
      // Skip weekends and holidays
      if (
        !isWeekend(current) && 
        !holidayDates.includes(current.toISODate())
      ) {
        count++;
      }
      current = current.plus({ days: 1 });
    }
    
    return count;
  };

  // Calculate total days including weekends and holidays for display purposes
  const calculateTotalDays = (start: DateTime, end: DateTime) => {
    if (!start || !end) return 0;
    
    return Interval.fromDateTimes(
      start.startOf('day'),
      end.endOf('day')
    ).length('days');
  };

  // Update days count when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const businessDays = calculateBusinessDays(startDate, endDate);
      setDaysCount(businessDays);
    } else {
      setDaysCount(0);
    }
  }, [startDate, endDate, holidays]);

  // Handle date changes
  const handleStartDateChange = (date: DateTime | null) => {
    setStartDate(date);
    if (date && endDate && date > endDate) {
      setEndDate(date);
    }
  };

  const handleEndDateChange = (date: DateTime | null) => {
    setEndDate(date);
  };

  // Custom day component to highlight holidays
  const renderDay = (props: PickersDayProps<DateTime>) => {
    const { day, ...other } = props;
    const dateStr = day.toISODate();
    const holiday = holidays.find(h => DateTime.fromISO(h.date).toISODate() === dateStr);
    
    // Determine if this day is a holiday and what type
    let isHoliday = false;
    let holidayType = '';
    let holidayName = '';
    
    if (holiday) {
      isHoliday = true;
      holidayType = holiday.type as string;
      holidayName = holiday.name;
    }
    
    // Add appropriate class based on holiday type
    const dayClassName = 
      isHoliday 
        ? `holiday-day ${holidayType === 'bank' ? 'bank-holiday' : 'provincial-holiday'}`
        : '';
    
    return (
      <Tooltip title={isHoliday ? `${holidayName} (${holidayType === 'bank' ? 'Bank Holiday' : 'Provincial Holiday'})` : ''}>
        <StyledDay 
          {...other} 
          day={day}
          className={`${other.className || ''} ${dayClassName}`}
        />
      </Tooltip>
    );
  };

  // Submit vacation request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    if (!session?.user?.id) {
      setError('You must be logged in to request vacation');
      return;
    }
    
    // Check if start date is after end date
    if (startDate > endDate) {
      setError('Start date cannot be after end date');
      return;
    }
    
    // Check if any selected days fall on holidays
    const holidayDates = holidays.map(h => DateTime.fromISO(h.date).toISODate());
    let current = startDate.startOf('day');
    const lastDay = endDate.startOf('day');
    const conflictingHolidays: string[] = [];
    
    while (current <= lastDay) {
      if (holidayDates.includes(current.toISODate())) {
        const holiday = holidays.find(h => 
          DateTime.fromISO(h.date).toISODate() === current.toISODate()
        );
        if (holiday) {
          conflictingHolidays.push(holiday.name);
        }
      }
      current = current.plus({ days: 1 });
    }
    
    // Instead of blocking holiday selection, we'll show a note if holidays are included
    // in selected vacation dates, but allow the booking to proceed
    
    // Check if requested days exceed available vacation days
    if (!session.user.total_vacation_days) {
      setError('Your vacation allowance has not been set. Please update your settings first.');
      return;
    }
    
    // Fetch existing vacation days used this year
    try {
      const vacationsResponse = await fetch('/api/vacations');
      if (!vacationsResponse.ok) {
        throw new Error('Failed to fetch existing vacations');
      }
      
      const existingVacations = await vacationsResponse.json();
      const currentYear = DateTime.now().year;
      
      // Filter vacations for the current year
      const thisYearVacations = existingVacations.filter((v: any) => {
        const vacationDate = DateTime.fromISO(v.start_date);
        return vacationDate.year === currentYear;
      });
      
      // Calculate used days (excluding weekends and holidays)
      let usedDays = 0;
      
      for (const vacation of thisYearVacations) {
        const vStartDate = DateTime.fromISO(vacation.start_date);
        const vEndDate = DateTime.fromISO(vacation.end_date);
        
        usedDays += calculateBusinessDays(vStartDate, vEndDate);
      }
      
      // Calculate if the requested days would exceed the allowance
      const totalRequested = usedDays + daysCount;
      if (totalRequested > session.user.total_vacation_days) {
        setError(`This request would exceed your annual vacation allowance. You have ${session.user.total_vacation_days} days total, with ${usedDays} already used.`);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vacations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          startDate: startDate.toISO(),
          endDate: endDate.toISO(),
          note: note.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to book vacation');
      }
      
      // Get the newly created vacation data
      const newVacation = await response.json();
      
      setSuccess(true);
      
      // Clear form after successful submission
      setStartDate(null);
      setEndDate(null);
      setNote('');
      setDaysCount(0);
      
      // Redirect to dashboard after short delay with cache-busting query parameter
      // to force a refresh of the dashboard data
      setTimeout(() => {
        router.push('/dashboard?refresh=' + new Date().getTime());
        // In a real app, we could also use a state management library or React Query
        // to invalidate and refresh the vacation data cache
      }, 2000);
      
    } catch (error) {
      console.error('Error booking vacation:', error);
      setError(error instanceof Error ? error.message : 'Failed to book vacation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Request Vacation Time
        </Typography>
        
        <Paper elevation={0} sx={{ p: 4, mt: 3 }} variant="outlined">
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Select your vacation dates
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  disablePast
                  slots={{
                    day: renderDay
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  disablePast
                  minDate={startDate ?? undefined}
                  slots={{
                    day: renderDay
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Any specific details about this vacation request"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.default', 
                  borderRadius: 1,
                  mb: 2 
                }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      Vacation Summary
                    </Typography>
                    
                    {startDate && endDate && (
                      <>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            Date range:
                          </Typography>
                          <Typography variant="body2">
                            {startDate.toFormat('LLL d, yyyy')} - {endDate.toFormat('LLL d, yyyy')}
                          </Typography>
                        </Box>
                      
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            Total days off:
                          </Typography>
                          <Typography variant="body2">
                            {calculateTotalDays(startDate, endDate)} days
                          </Typography>
                        </Box>
                        
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">
                            Working days:
                          </Typography>
                          <Typography variant="body2" fontWeight="medium" color="primary.main">
                            {daysCount} days
                          </Typography>
                        </Box>

                        {(() => {
                          // Check for weekends
                          const totalDays = calculateTotalDays(startDate, endDate);
                          const weekendDays = totalDays - daysCount;
                          
                          if (weekendDays > 0) {
                            return (
                              <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">
                                  Weekend/holiday days:
                                </Typography>
                                <Typography variant="body2">
                                  {weekendDays} days
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        })()}

                        {(() => {
                          // Check for overlapping holidays
                          const holidayDates = holidays.map(h => DateTime.fromISO(h.date).toISODate());
                          let current = startDate.startOf('day');
                          const lastDay = endDate.startOf('day');
                          const conflictingHolidays: {name: string, date: string, type: string}[] = [];
                          
                          while (current <= lastDay) {
                            const currentDateStr = current.toISODate();
                            if (holidayDates.includes(currentDateStr)) {
                              const holiday = holidays.find(h => 
                                DateTime.fromISO(h.date).toISODate() === currentDateStr
                              );
                              if (holiday) {
                                conflictingHolidays.push({
                                  name: holiday.name,
                                  date: current.toFormat('MMM d, yyyy'),
                                  type: holiday.type as string
                                });
                              }
                            }
                            current = current.plus({ days: 1 });
                          }

                          if (conflictingHolidays.length > 0) {
                            return (
                              <Alert severity="info" sx={{ mt: 1 }}>
                                <Typography variant="body2" gutterBottom>
                                  Your selection includes {conflictingHolidays.length} holiday(s):
                                </Typography>
                                <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                                  {conflictingHolidays.map((holiday, index) => (
                                    <Box component="li" key={index}>
                                      <Typography variant="body2">
                                        {holiday.name} ({holiday.date}) - {holiday.type === 'bank' ? 'Bank Holiday' : 'General Holiday'}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  Only {daysCount} working day(s) will be deducted from your vacation balance.
                                </Typography>
                              </Alert>
                            );
                          }
                          return null;
                        })()}

                        {(() => {
                          // Check if this would be a long weekend
                          if (daysCount <= 2) {
                            const dayBeforeStart = startDate.minus({ days: 1 });
                            const dayAfterEnd = endDate.plus({ days: 1 });
                            
                            const isWeekendDay = (date: DateTime) => date.weekday > 5;
                            
                            if (isWeekendDay(dayBeforeStart) || isWeekendDay(dayAfterEnd)) {
                              return (
                                <Alert severity="success" sx={{ mt: 1 }}>
                                  <Typography variant="body2">
                                    This would create a long weekend! Enjoy your extended break.
                                  </Typography>
                                </Alert>
                              );
                            }
                          }
                          return null;
                        })()}
                      </>
                    )}
                  </Stack>
                </Box>
              </Grid>
              
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button 
                    variant="outlined" 
                    onClick={() => router.push('/dashboard')}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={loading || !startDate || !endDate}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
      
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={() => setSuccess(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Vacation request submitted successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}
