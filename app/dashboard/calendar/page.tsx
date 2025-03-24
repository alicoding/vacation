'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, Typography, Container, Paper, Grid, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, 
  Chip, Alert
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';

// Styled components for the calendar
const CalendarCell = styled(TableCell)(({ theme }) => ({
  height: '80px',
  width: '14.28%', // 7 days per week
  verticalAlign: 'top',
  padding: theme.spacing(1),
  position: 'relative',
  '&.weekend': {
    backgroundColor: theme.palette.grey[50],
  },
  '&.other-month': {
    color: theme.palette.text.disabled,
  },
  '&.today': {
    backgroundColor: theme.palette.primary.light + '33', // Add transparency
  },
  '&.holiday': {
    backgroundColor: theme.palette.warning.light + '33', // Add transparency
  },
  '&.vacation': {
    position: 'relative',
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: theme.palette.success.light + '22', // Very transparent
      zIndex: 0,
      pointerEvents: 'none',
    }
  }
}));

const DayNumber = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  marginBottom: theme.spacing(1),
}));

const EventChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontSize: '0.75rem',
  height: 24,
}));

export default function CalendarPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(DateTime.local());
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch vacations and holidays
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch vacations
        const vacationsRes = await fetch('/api/vacations');
        if (!vacationsRes.ok) {
          throw new Error('Failed to fetch vacations');
        }
        const vacationsData = await vacationsRes.json();
        
        // Fetch holidays for the current year
        const holidaysRes = await fetch(`/api/holidays?year=${currentDate.year}`);
        if (!holidaysRes.ok) {
          throw new Error('Failed to fetch holidays');
        }
        const holidaysData = await holidaysRes.json();
        
        setVacations(vacationsData);
        setHolidays(holidaysData);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [currentDate.year]);

  // Generate calendar data for the current month
  const generateCalendarDays = () => {
    // Get start of the month
    const firstDay = currentDate.startOf('month');
    
    // Get start of the first week (might be in previous month)
    const startDay = firstDay.startOf('week');
    
    // Array to hold all days
    const days = [];
    
    // Generate 6 weeks (42 days) to make sure we cover the whole month
    for (let i = 0; i < 42; i++) {
      const day = startDay.plus({ days: i });
      days.push(day);
    }
    
    // Group days by weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return weeks;
  };

  // Helper to check if a date has a vacation
  const getVacationsForDate = (date: DateTime) => {
    return vacations.filter(vacation => {
      const startDate = DateTime.fromISO(vacation.start_date);
      const endDate = DateTime.fromISO(vacation.end_date);
      return date >= startDate.startOf('day') && date <= endDate.endOf('day');
    });
  };

  // Helper to check if a date is a holiday
  const getHolidayForDate = (date: DateTime) => {
    return holidays.find(holiday => {
      const holidayDate = DateTime.fromISO(holiday.date);
      return date.hasSame(holidayDate, 'day');
    });
  };

  // Helper to check if a date is today
  const isToday = (date: DateTime) => {
    return date.hasSame(DateTime.local(), 'day');
  };

  // Helper to check if a date is a weekend
  const isWeekend = (date: DateTime) => {
    return date.weekday > 5; // 6 = Saturday, 7 = Sunday in Luxon
  };

  // Helper to check if a date is in the current month
  const isCurrentMonth = (date: DateTime) => {
    return date.month === currentDate.month;
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => prev.minus({ months: 1 }));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => prev.plus({ months: 1 }));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(DateTime.local());
  };

  // Generate weeks for the calendar
  const weeks = generateCalendarDays();

  return (
    <Container maxWidth="xl">
      <Box my={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Vacation Calendar
          </Typography>
          
          <Box display="flex" gap={1}>
            <Chip 
              label="Today" 
              color="primary" 
              variant="outlined" 
              onClick={goToCurrentMonth} 
              clickable 
            />
            <Chip 
              label="Previous" 
              onClick={goToPreviousMonth} 
              clickable 
            />
            <Chip 
              label="Next" 
              onClick={goToNextMonth} 
              clickable 
            />
          </Box>
        </Box>
        
        <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
          {currentDate.toFormat('MMMM yyyy')}
        </Typography>
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell align="center">Sunday</TableCell>
                  <TableCell align="center">Monday</TableCell>
                  <TableCell align="center">Tuesday</TableCell>
                  <TableCell align="center">Wednesday</TableCell>
                  <TableCell align="center">Thursday</TableCell>
                  <TableCell align="center">Friday</TableCell>
                  <TableCell align="center">Saturday</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {weeks.map((week, weekIndex) => (
                  <TableRow key={weekIndex}>
                    {week.map((day, dayIndex) => {
                      const dayVacations = getVacationsForDate(day);
                      const holiday = getHolidayForDate(day);
                      
                      // Determine cell classname based on conditions
                      const cellClasses = [
                        isWeekend(day) ? 'weekend' : '',
                        !isCurrentMonth(day) ? 'other-month' : '',
                        isToday(day) ? 'today' : '',
                        holiday ? 'holiday' : '',
                        dayVacations.length > 0 ? 'vacation' : '',
                      ].filter(Boolean).join(' ');
                      
                      return (
                        <CalendarCell key={dayIndex} className={cellClasses}>
                          <DayNumber variant="body2">
                            {day.toFormat('d')}
                          </DayNumber>
                          
                          {holiday && (
                            <EventChip 
                              size="small"
                              label={holiday.name}
                              color="warning"
                              variant="outlined"
                            />
                          )}
                          
                          {dayVacations.map((vacation) => (
                            <EventChip
                              key={vacation.id}
                              size="small"
                              label="Vacation"
                              color="success"
                            />
                          ))}
                        </CalendarCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        
        <Box mt={4} display="flex" gap={2} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'success.light', borderRadius: '50%' }} />
            <Typography variant="body2">Vacation</Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'warning.light', borderRadius: '50%' }} />
            <Typography variant="body2">Holiday</Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'grey.100', borderRadius: '50%' }} />
            <Typography variant="body2">Weekend</Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 16, height: 16, backgroundColor: 'primary.light', borderRadius: '50%' }} />
            <Typography variant="body2">Today</Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
