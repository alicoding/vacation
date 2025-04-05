'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Tooltip } from '@mui/material';
import { DateTime, Interval } from 'luxon';
import { Holiday, VacationBooking } from '@/types';
import { styled } from '@mui/material/styles';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import useHolidays from '@/lib/hooks/useHolidays';
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth
import { CALENDAR_COLORS } from '@/lib/constants/colors';

interface MiniCalendarProps {
  holidays?: Holiday[];
  vacations?: VacationBooking[];
  province?: string;
  onDateSelect?: (date: DateTime) => void;
  selectedDate?: DateTime;
  vacationToExclude?: string; // Add prop to exclude a specific vacation from the display
}

const CalendarDay = styled(Box)(({ theme }) => ({
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  fontSize: '0.75rem',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
}));

// Helper function to get array of dates in interval
function eachDayOfInterval(start: DateTime, end: DateTime): DateTime[] {
  const days: DateTime[] = [];
  let current = start;

  while (current <= end) {
    days.push(current);
    current = current.plus({ days: 1 });
  }

  return days;
}

export default function MiniCalendar({
  holidays = [],
  vacations = [],
  province = 'ON',
  onDateSelect,
  selectedDate: externalSelectedDate,
  vacationToExclude,
}: MiniCalendarProps) {
  // Initialize currentMonth based on externalSelectedDate if available, otherwise use today
  const [currentMonth, setCurrentMonth] = useState(
    externalSelectedDate
      ? externalSelectedDate.startOf('month')
      : DateTime.now().startOf('month'),
  );
  const [selectedDate, setSelectedDate] = useState(
    externalSelectedDate || DateTime.now(),
  );
  console.log('[MiniCalendar] Rendering/Re-rendering', {
    externalSelectedDate: externalSelectedDate?.toISO(),
    currentMonth: currentMonth.toISO(),
    selectedDate: selectedDate.toISO(),
  });
  // Get user settings for week start day
  const { user } = useAuth();
  const weekStartsOn = user?.week_starts_on === 'monday' ? 1 : 0; // 0 for Sunday, 1 for Monday

  // Use our useHolidays hook to fetch holidays directly
  const {
    holidays: clientHolidays,
    loading: holidaysLoading,
    isHoliday: checkIsHoliday, // Keep this, it uses ISO strings
    getHoliday, // Keep this, it uses ISO strings
  } = useHolidays(currentMonth.year, province);

  // Sync with external selected date when it changes
  useEffect(() => {
    console.log('[MiniCalendar] Sync Effect RUNNING. Deps:', {
      externalSelectedDate: externalSelectedDate?.toISO(),
      currentMonth: currentMonth.toISO(),
    });
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
      // Also update the displayed month if the external date's month is different
      if (!externalSelectedDate.hasSame(currentMonth, 'month')) {
        console.log(
          '[MiniCalendar] Sync Effect: Updating currentMonth to match externalSelectedDate month',
          externalSelectedDate.startOf('month').toISO(),
        );
        setCurrentMonth(externalSelectedDate.startOf('month'));
      }
    }
  }, [externalSelectedDate]); // ONLY trigger sync when the external date prop changes

  // Combine prop holidays with client-fetched holidays
  // const allHolidays = [...holidays, ...clientHolidays]; // Removed: Rely on hook directly

  // Removed: Redundant parsing, rely on hook directly
  // const holidayDates = allHolidays.map((h) => {
  //   // Create a DateTime from the holiday date string
  //   return typeof h.date === 'string'
  //     ? DateTime.fromISO(h.date, { zone: 'utc' })
  //     : DateTime.fromJSDate(h.date as Date, { zone: 'utc' });
  // });

  // Parse vacation date ranges using Luxon DateTime
  const vacationDateRanges = vacations.map((v) => {
    const startDate =
      typeof v.start_date === 'string'
        ? DateTime.fromISO(v.start_date, { zone: 'utc' })
        : DateTime.fromJSDate(v.start_date, { zone: 'utc' });

    const endDate =
      typeof v.end_date === 'string'
        ? DateTime.fromISO(v.end_date, { zone: 'utc' })
        : DateTime.fromJSDate(v.end_date, { zone: 'utc' });

    return { start: startDate, end: endDate };
  });

  // Removed: Redundant internal isHoliday check, rely on hook's getHoliday below
  // const isHoliday = (date: DateTime): boolean => {
  //   // First check the direct holiday dates array
  //   const directMatch = holidayDates.some((holidayDate) =>
  //     date.toUTC().hasSame(holidayDate.toUTC(), 'day'), // Compare UTC dates
  //   );
  //
  //   if (directMatch) return true;
  //
  //   // Then use the hook's isHoliday method which has proper date normalization
  //   const isoString = date.toISO();
  //   return isoString ? checkIsHoliday(isoString).isHoliday : false;
  // };

  // Get holiday name if it exists
  // Removed: Redundant internal getHolidayName, rely on hook's getHoliday below
  // const getHolidayName = (date: DateTime): string | undefined => {
  //   // First check direct holiday list
  //   const holiday = allHolidays.find((h) => {
  //     const holidayDate =
  //       typeof h.date === 'string'
  //         ? DateTime.fromISO(h.date, { zone: 'utc' })
  //         : DateTime.fromJSDate(h.date as Date, { zone: 'utc' });
  //
  //     return date.toUTC().hasSame(holidayDate.toUTC(), 'day'); // Compare UTC dates
  //   });
  //
  //   if (holiday) return holiday.name;
  //   // Then try the hook's method
  //   const isoString = date.toISO();
  //   if (!isoString) return undefined;
  //
  //   const hookHoliday = getHoliday(isoString);
  //   return hookHoliday?.name;
  // };

  // Check if a date is within a vacation
  const isVacation = (date: DateTime): boolean => {
    return vacationDateRanges.some((range) => {
      // Use Interval.contains for robust range checking
      // Adjust end date to be inclusive
      const interval = Interval.fromDateTimes(
        range.start,
        range.end.endOf('day'),
      );
      return interval.contains(date);
    });
  };

  // Get vacation info if it exists for a date
  const getVacationInfo = (date: DateTime): string | undefined => {
    const vacation = vacations.find((v) => {
      const startDate =
        typeof v.start_date === 'string'
          ? DateTime.fromISO(v.start_date, { zone: 'utc' })
          : DateTime.fromJSDate(v.start_date, { zone: 'utc' });

      const endDate =
        typeof v.end_date === 'string'
          ? DateTime.fromISO(v.end_date, { zone: 'utc' })
          : DateTime.fromJSDate(v.end_date, { zone: 'utc' });

      // Compare start of day to avoid timezone/time issues
      // Use Interval.contains for robust range checking
      // Adjust end date to be inclusive
      const interval = Interval.fromDateTimes(startDate, endDate.endOf('day'));
      return interval.contains(date);
    });

    if (!vacation) return undefined;

    let label = 'Vacation';
    if (vacation.is_half_day) {
      label = `Half-day (${vacation.half_day_portion || ''})`;
    }

    return label;
  };

  // Get all days for the current month view
  const daysToDisplay = (): DateTime[] => {
    // Get the first and last day of the month
    const monthStart = currentMonth.startOf('month');
    const monthEnd = currentMonth.endOf('month');

    // Calculate offset based on user's week start preference
    let startOffset;
    if (weekStartsOn === 0) {
      // Sunday start (Luxon weekday 7)
      const dayOfWeek = monthStart.weekday; // 1-7
      startOffset = dayOfWeek === 7 ? 0 : dayOfWeek; // If Sunday, offset 0, else offset is weekday number
    } else {
      // Monday start (Luxon weekday 1)
      const dayOfWeek = monthStart.weekday; // 1-7
      startOffset = dayOfWeek === 1 ? 0 : dayOfWeek - 1; // If Monday, offset 0, else offset is weekday number - 1
    }

    // Calculate end offset (simpler way: ensure 42 days total)
    const calendarStart = monthStart.minus({ days: startOffset });
    // Ensure we always display 6 weeks (42 days)
    const calendarEnd = calendarStart.plus({ days: 41 });

    // Get all days in this range
    return eachDayOfInterval(calendarStart, calendarEnd);
  };

  // Navigation handlers
  const prevMonth = () => {
    const newMonth = currentMonth.minus({ months: 1 });
    console.log(
      '[MiniCalendar] prevMonth: Setting currentMonth to',
      newMonth.toISO(),
    );
    setCurrentMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = currentMonth.plus({ months: 1 });
    console.log(
      '[MiniCalendar] nextMonth: Setting currentMonth to',
      newMonth.toISO(),
    );
    setCurrentMonth(newMonth);
  };

  // Handle date selection with callback to parent
  const handleDateClick = (day: DateTime) => {
    // Don't allow selection of vacation days
    if (isVacation(day)) {
      return;
    }

    setSelectedDate(day);
    if (onDateSelect) {
      onDateSelect(day);
    }
  };

  // Get the day style based on its state
  const getDayStyle = (
    day: DateTime,
    isSelected: boolean,
    isOutsideMonth: boolean,
    holidayType: string[] | undefined, // Pass the type array instead of boolean
    isVacationDay: boolean,
  ) => {
    // Base styles
    const styles: any = {
      margin: '0 auto',
      color: isOutsideMonth
        ? 'text.disabled'
        : isSelected
          ? 'common.white'
          : 'text.primary',
    };

    // Background color logic matching FullCalendar patterns
    if (isSelected) {
      styles.backgroundColor = 'primary.main';
    } else if (isVacationDay) {
      styles.backgroundColor =
        CALENDAR_COLORS.VACATION.FULL_DAY || 'rgba(46, 125, 50, 0.15)';
      styles.border = `1px solid ${CALENDAR_COLORS.VACATION.TEXT || '#2e7d32'}`;
    } else if (holidayType && holidayType.length > 0) {
      // Apply styles based on holiday type priority: Bank > Federal > Public
      if (holidayType.includes('Bank')) {
        styles.backgroundColor =
          CALENDAR_COLORS.HOLIDAY.BANK || 'rgba(211, 47, 47, 0.15)'; // Reddish
        styles.border = `1px solid ${CALENDAR_COLORS.HOLIDAY.TEXT || '#d32f2f'}`;
      } else if (holidayType.includes('Federal')) {
        // Assuming a Federal color exists, otherwise fallback
        styles.backgroundColor =
          CALENDAR_COLORS.HOLIDAY.FEDERAL || 'rgba(25, 118, 210, 0.15)'; // Bluish
        styles.border = `1px solid ${CALENDAR_COLORS.HOLIDAY.TEXT_FEDERAL || '#1976d2'}`; // Adjust color name if needed
      } else {
        // Default to Public style if any type exists
        styles.backgroundColor =
          CALENDAR_COLORS.HOLIDAY.PUBLIC || 'rgba(245, 124, 0, 0.15)'; // Orangish
        styles.border = `1px solid ${CALENDAR_COLORS.HOLIDAY.TEXT_PUBLIC || '#f57c00'}`; // Adjust color name if needed
      }
    } else {
      styles.backgroundColor = 'transparent';
    }

    return styles;
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Calendar header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={1}
      >
        <ChevronLeftIcon
          style={{ height: 16, width: 16, cursor: 'pointer' }}
          onClick={prevMonth}
        />

        <Typography variant="subtitle2">
          {currentMonth.toFormat('MMM yyyy')}
        </Typography>

        <ChevronRightIcon
          style={{ height: 16, width: 16, cursor: 'pointer' }}
          onClick={nextMonth}
        />
      </Box>

      {/* Day headers */}
      <Grid container spacing={0} sx={{ mb: 0.5 }}>
        {/* Generate day headers based on week start */}
        {(weekStartsOn === 0
          ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
          : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
        ).map((dayHeader, index) => (
          <Grid item xs={12 / 7} key={index} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {dayHeader}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar days */}
      <Grid container spacing={0}>
        {daysToDisplay().map((day, index) => {
          // Get the full holiday object to access its type
          const holiday = getHoliday(day.toISO() || '');
          const isHolidayDay = !!holiday;
          const holidayName = holiday ? holiday.name : '';
          const isVacationDay = isVacation(day);
          const vacationInfo = isVacationDay ? getVacationInfo(day) : '';
          const isOutsideMonth = !day.hasSame(currentMonth, 'month');
          const isSelected = day.hasSame(selectedDate, 'day');
          const isWeekend = [6, 7].includes(day.weekday);
          const tooltipTitle = holidayName || vacationInfo || '';

          return (
            <Grid
              item
              xs={12 / 7}
              key={index}
              sx={{ textAlign: 'center', py: 0.25 }}
            >
              <Tooltip title={tooltipTitle} arrow placement="top">
                <CalendarDay
                  onClick={() => handleDateClick(day)}
                  className={isVacationDay ? 'disabled' : ''}
                  sx={getDayStyle(
                    day,
                    isSelected,
                    isOutsideMonth,
                    holiday?.type, // Pass the type array
                    isVacationDay,
                  )}
                >
                  {day.toFormat('d')}
                </CalendarDay>
              </Tooltip>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
