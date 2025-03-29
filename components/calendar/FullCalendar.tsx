'use client';

import { 
  Box, Typography, Container, Paper, Grid, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, 
  Chip, Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';
import { CALENDAR_COLORS } from '@/lib/constants/colors';
import { useSession } from '@/lib/auth-helpers';
import type { Session } from '@/types/auth';

// Extend the Session user type to include week_starts_on
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  week_starts_on?: string;
}

interface ExtendedSession extends Session {
  user: ExtendedUser;
}

// Styled components for the calendar
const CalendarCell = styled(TableCell)(({ theme }) => ({
  height: '80px',
  width: '14.28%', // 7 days per week
  verticalAlign: 'top',
  padding: theme.spacing(1),
  position: 'relative',
  '&.weekend': {
    backgroundColor: CALENDAR_COLORS.DISABLED.BACKGROUND,
  },
  '&.other-month': {
    color: CALENDAR_COLORS.OTHER_MONTH.TEXT,
  },
  '&.today': {
    backgroundColor: CALENDAR_COLORS.TODAY.BACKGROUND,
  },
  '&.holiday': {
    backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
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
      backgroundColor: CALENDAR_COLORS.VACATION.FULL_DAY,
      zIndex: 0,
      pointerEvents: 'none',
    },
  },
}));

const DayNumber = styled(Typography)(({ theme }) => ({
  fontSize: theme.typography.body2.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  marginBottom: theme.spacing(1),
}));

const EventChip = styled(Chip)(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontSize: '0.75rem',
}));

interface FullCalendarProps {
  currentDate: DateTime;
  vacations: VacationBooking[];
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onCurrentMonth: () => void;
}

export default function FullCalendar({
  currentDate,
  vacations,
  holidays,
  loading,
  error,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
}: FullCalendarProps) {
  const { data: session, status } = useSession();
  const weekStartsOn = (session as ExtendedSession)?.user?.week_starts_on || 'sunday';
  
  // Generate calendar days
  const generateCalendarDays = () => {
    // Get start of the month
    const firstDay = currentDate.startOf('month');
    
    // Find the day that starts the week containing the first of the month
    let startDay;
    if (weekStartsOn === 'sunday') {
      // If week starts on Sunday (Luxon weekday 7), find the Sunday before or on firstDay
      const dayOfWeek = firstDay.weekday;
      const daysToSubtract = dayOfWeek === 7 ? 0 : dayOfWeek;
      startDay = firstDay.minus({ days: daysToSubtract });
    } else {
      // If week starts on Monday (Luxon weekday 1), find the Monday before or on firstDay
      const dayOfWeek = firstDay.weekday;
      const daysToSubtract = dayOfWeek === 1 ? 0 : dayOfWeek - 1;
      startDay = firstDay.minus({ days: daysToSubtract });
    }
    
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
    return vacations.filter((vacation) => {
      const startDate = DateTime.fromISO(vacation.start_date.toString());
      const endDate = DateTime.fromISO(vacation.end_date.toString());
      return date >= startDate.startOf('day') && date <= endDate.endOf('day');
    });
  };

  // Helper to check if a date is a holiday
  const getHolidayForDate = (date: DateTime) => {
    return holidays.find((holiday) => {
      // Convert both dates to UTC for consistent comparison
      const holidayDate = DateTime.fromISO(holiday.date, { zone: 'utc' });
      const dateInUtc = date.toUTC();
      // Compare the dates ignoring timezone differences
      return dateInUtc.hasSame(holidayDate, 'day');
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

  // Generate weeks for the calendar
  const weeks = generateCalendarDays();

  // Day headers based on user preference
  const getDayHeaders = () => {
    if (weekStartsOn === 'sunday') {
      return (
        <TableRow>
          <TableCell align="center">Sunday</TableCell>
          <TableCell align="center">Monday</TableCell>
          <TableCell align="center">Tuesday</TableCell>
          <TableCell align="center">Wednesday</TableCell>
          <TableCell align="center">Thursday</TableCell>
          <TableCell align="center">Friday</TableCell>
          <TableCell align="center">Saturday</TableCell>
        </TableRow>
      );
    } else {
      return (
        <TableRow>
          <TableCell align="center">Monday</TableCell>
          <TableCell align="center">Tuesday</TableCell>
          <TableCell align="center">Wednesday</TableCell>
          <TableCell align="center">Thursday</TableCell>
          <TableCell align="center">Friday</TableCell>
          <TableCell align="center">Saturday</TableCell>
          <TableCell align="center">Sunday</TableCell>
        </TableRow>
      );
    }
  };

  return (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Vacation Calendar
        </Typography>
        
        <Box display="flex" gap={1}>
          <Chip 
            label="Today" 
            color="primary" 
            variant="outlined" 
            onClick={onCurrentMonth} 
            clickable 
          />
          <Chip 
            label="Previous" 
            onClick={onPrevMonth} 
            clickable 
          />
          <Chip 
            label="Next" 
            onClick={onNextMonth} 
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
              {getDayHeaders()}
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
    </>
  );
}