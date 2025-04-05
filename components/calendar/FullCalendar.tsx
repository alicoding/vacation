'use client';

import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { DateTime, Interval } from 'luxon'; // Import Interval
import { VacationBooking, Holiday } from '@/types'; // Holiday type has date: string | Date, type: string[]
import { CALENDAR_COLORS } from '@/lib/constants/colors';
import { useAuth } from '@/components/auth/AuthProvider'; // Use AuthProvider context
// ExtendedUser and ExtendedSession interfaces removed as we use the user from useAuth directly

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
  // '&.holiday': { // Remove generic holiday class style
  //   backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
  // },
  '&.holiday-public': {
    backgroundColor: CALENDAR_COLORS.HOLIDAY.PUBLIC,
  },
  '&.holiday-bank': {
    backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
  },
  '&.holiday-federal': {
    backgroundColor: CALENDAR_COLORS.HOLIDAY.FEDERAL,
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
  vacations, // Log this
  holidays,
  loading,
  error,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
}: FullCalendarProps) {
  const { user, isLoading, isAuthenticated } = useAuth(); // Use values from useAuth
  // Access week_starts_on directly from the user object provided by useAuth
  const weekStartsOn = user?.week_starts_on === 'monday' ? 1 : 0; // 0 for Sunday, 1 for Monday

  // Generate calendar days
  const generateCalendarDays = () => {
    // Get start of the month
    const firstDay = currentDate.startOf('month');

    // Find the day that starts the week containing the first of the month
    let startDay;
    if (weekStartsOn === 0) {
      // Compare against number 0 (Sunday)
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
    const dateISO = date.toISODate(); // Get the ISO date string 'YYYY-MM-DD'
    if (!dateISO) return []; // Guard against invalid dates

    // console.log(`Checking vacations for date: ${dateISO}`);

    return vacations.filter((vacation) => {
      // Parse dates explicitly in UTC and compare start of day
      const startDate = DateTime.fromISO(vacation.start_date.toString(), {
        zone: 'utc',
      }).startOf('day');
      // Adjust the end date to include the whole day
      const endDate = DateTime.fromISO(vacation.end_date.toString(), {
        zone: 'utc',
      }).endOf('day');
      // Use Interval.fromDateTimes for robust range checking
      const interval = Interval.fromDateTimes(startDate, endDate);
      const containsDate = interval.contains(date); // Check contains

      return containsDate;
    });
  };

  // Helper to check if a date is a holiday and return the holiday object
  // Assumes 'holidays' prop contains HolidayWithTypeArray objects
  // Helper to check if a date is a holiday and return the holiday object
  // Assumes 'holidays' prop contains Holiday objects from @/types
  const getHolidayForDate = (date: DateTime): Holiday | undefined => {
    const dateISO = date.toISODate();
    if (!dateISO) return undefined;

    return holidays.find((holiday) => {
      // Handle both string and Date types for holiday.date
      let holidayLuxonDate: DateTime;
      // Parse holiday date explicitly in UTC
      if (typeof holiday.date === 'string') {
        holidayLuxonDate = DateTime.fromISO(holiday.date, { zone: 'utc' });
      } else {
        // Assume it's a Date object
        holidayLuxonDate = DateTime.fromJSDate(holiday.date, { zone: 'utc' });
      }
      const holidayDate = holidayLuxonDate.toISODate();
      return holidayDate === dateISO;
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
    if (weekStartsOn === 0) {
      // Compare against number 0 (Sunday)
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
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
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
          <Chip label="Previous" onClick={onPrevMonth} clickable />
          <Chip label="Next" onClick={onNextMonth} clickable />
        </Box>
      </Box>

      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        {currentDate.toFormat('MMMM yyyy')}
      </Typography>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="50vh"
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>{getDayHeaders()}</TableHead>
            <TableBody>
              {weeks.map((week, weekIndex) => (
                <TableRow key={weekIndex}>
                  {week.map((day, dayIndex) => {
                    const dayVacations = getVacationsForDate(day);
                    const holiday = getHolidayForDate(day); // Now returns HolidayWithTypeArray | undefined

                    // Determine cell classname based on conditions
                    let holidayClass = '';
                    if (holiday) {
                      // Prioritize Bank > Federal > Public
                      if (holiday.type.includes('Bank')) {
                        holidayClass = 'holiday-bank';
                      } else if (holiday.type.includes('Federal')) {
                        holidayClass = 'holiday-federal';
                      } else if (holiday.type.length > 0) {
                        // Default to public if any type exists
                        holidayClass = 'holiday-public';
                      }
                    }

                    const cellClasses = [
                      isWeekend(day) ? 'weekend' : '',
                      !isCurrentMonth(day) ? 'other-month' : '',
                      isToday(day) ? 'today' : '',
                      holidayClass, // Add the specific holiday class
                      dayVacations.length > 0 ? 'vacation' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <CalendarCell key={dayIndex} className={cellClasses}>
                        <DayNumber variant="body2">
                          {day.toFormat('d')}
                        </DayNumber>

                        {holiday && (
                          <EventChip
                            size="small"
                            label={holiday.name}
                            // Use color based on type, default to warning
                            color={
                              holiday.type.includes('Bank')
                                ? 'warning'
                                : holiday.type.includes('Federal')
                                  ? 'info' // Assuming 'info' for blue
                                  : holiday.type.includes('Public')
                                    ? 'warning' // Orange/Amber for public
                                    : 'default'
                            }
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
