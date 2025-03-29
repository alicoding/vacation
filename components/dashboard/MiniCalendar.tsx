'use client';
import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Tooltip } from '@mui/material';
import { DateTime, Interval } from 'luxon';
import { Holiday, VacationBooking } from '@/types';
import { styled } from '@mui/material/styles';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import useHolidays from '@/lib/hooks/useHolidays';
import { CALENDAR_COLORS } from '@/lib/constants/colors';

interface MiniCalendarProps {
  holidays?: Holiday[];
  vacations?: VacationBooking[];
  province?: string;
  onDateSelect?: (date: DateTime) => void;
  selectedDate?: DateTime;
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
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(DateTime.now());
  const [selectedDate, setSelectedDate] = useState(externalSelectedDate || DateTime.now());
  
  // Use our useHolidays hook to fetch holidays directly
  const { 
    holidays: clientHolidays, 
    loading: holidaysLoading,
    isHoliday: checkIsHoliday,
    getHoliday,
  } = useHolidays(currentMonth.year, province);
  
  // Sync with external selected date when it changes
  useEffect(() => {
    if (externalSelectedDate) {
      setSelectedDate(externalSelectedDate);
    }
  }, [externalSelectedDate]);
  
  // Combine prop holidays with client-fetched holidays
  const allHolidays = [...holidays, ...clientHolidays];
  
  // Parse holiday dates using Luxon DateTime with UTC
  const holidayDates = allHolidays.map((h) => {
    // Create a DateTime from the holiday date string
    return typeof h.date === 'string' 
      ? DateTime.fromISO(h.date, { zone: 'utc' }) 
      : DateTime.fromJSDate(h.date as Date, { zone: 'utc' });
  });
  
  // Parse vacation date ranges using Luxon DateTime
  const vacationDateRanges = vacations.map((v) => {
    const startDate = typeof v.start_date === 'string'
      ? DateTime.fromISO(v.start_date, { zone: 'utc' })
      : DateTime.fromJSDate(v.start_date as Date, { zone: 'utc' });
      
    const endDate = typeof v.end_date === 'string'
      ? DateTime.fromISO(v.end_date, { zone: 'utc' })
      : DateTime.fromJSDate(v.end_date as Date, { zone: 'utc' });
      
    return { start: startDate, end: endDate };
  });
  
  // Check if a date is a holiday
  const isHoliday = (date: DateTime): boolean => {
    // First check the direct holiday dates array
    const directMatch = holidayDates.some((holidayDate) => 
      date.hasSame(holidayDate, 'day'),
    );
    
    if (directMatch) return true;
    
    // Then use the hook's isHoliday method which has proper date normalization
    const isoString = date.toISO();
    return isoString ? checkIsHoliday(isoString).isHoliday : false;
  };
  
  // Get holiday name if it exists
  const getHolidayName = (date: DateTime): string | undefined => {
    // First check direct holiday list
    const holiday = allHolidays.find((h) => {
      const holidayDate = typeof h.date === 'string'
        ? DateTime.fromISO(h.date, { zone: 'utc' })
        : DateTime.fromJSDate(h.date as Date, { zone: 'utc' });
        
      return date.hasSame(holidayDate, 'day');
    });
    
    if (holiday) return holiday.name;
    // Then try the hook's method
    const isoString = date.toISO();
    if (!isoString) return undefined;
    
    const hookHoliday = getHoliday(isoString);
    return hookHoliday?.name;
  };
  
  // Check if a date is within a vacation
  const isVacation = (date: DateTime): boolean => {
    return vacationDateRanges.some((range) => 
      date >= range.start && date <= range.end,
    );
  };
  
  // Get vacation info if it exists for a date
  const getVacationInfo = (date: DateTime): string | undefined => {
    const vacation = vacations.find((v) => {
      const startDate = typeof v.start_date === 'string'
        ? DateTime.fromISO(v.start_date, { zone: 'utc' })
        : DateTime.fromJSDate(v.start_date as Date, { zone: 'utc' });
        
      const endDate = typeof v.end_date === 'string'
        ? DateTime.fromISO(v.end_date, { zone: 'utc' })
        : DateTime.fromJSDate(v.end_date as Date, { zone: 'utc' });
        
      return date >= startDate && date <= endDate;
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
    
    // Get the start of the first week and end of the last week
    const calendarStart = monthStart.startOf('week');
    const calendarEnd = monthEnd.endOf('week');
    
    // Get all days in this range
    return eachDayOfInterval(calendarStart, calendarEnd);
  };
  
  // Navigation handlers
  const prevMonth = () => {
    setCurrentMonth(currentMonth.minus({ months: 1 }));
  };
  
  const nextMonth = () => {
    setCurrentMonth(currentMonth.plus({ months: 1 }));
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
  const getDayStyle = (day: DateTime, isSelected: boolean, isOutsideMonth: boolean, isHolidayDay: boolean, isVacationDay: boolean) => {
    // Base styles
    const styles: any = {
      margin: '0 auto',
      color: isOutsideMonth ? 'text.disabled' : isSelected ? 'common.white' : 'text.primary',
    };
    
    // Background color logic matching FullCalendar patterns
    if (isSelected) {
      styles.backgroundColor = 'primary.main';
    } else if (isVacationDay) {
      styles.backgroundColor = CALENDAR_COLORS.VACATION.FULL_DAY || 'rgba(46, 125, 50, 0.15)';
      styles.border = `1px solid ${CALENDAR_COLORS.VACATION.TEXT || '#2e7d32'}`;
    } else if (isHolidayDay) {
      styles.backgroundColor = CALENDAR_COLORS.HOLIDAY.BANK || 'rgba(211, 47, 47, 0.15)';
      styles.border = `1px solid ${CALENDAR_COLORS.HOLIDAY.TEXT || '#d32f2f'}`;
    } else {
      styles.backgroundColor = 'transparent';
    }
    
    return styles;
  };
  
  return (
    <Box sx={{ p: 1 }}>
      {/* Calendar header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
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
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <Grid item xs={12/7} key={index} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>
      
      {/* Calendar days */}
      <Grid container spacing={0}>
        {daysToDisplay().map((day, index) => {
          const isHolidayDay = isHoliday(day);
          const holidayName = isHolidayDay ? getHolidayName(day) : '';
          const isVacationDay = isVacation(day);
          const vacationInfo = isVacationDay ? getVacationInfo(day) : '';
          const isOutsideMonth = !day.hasSame(currentMonth, 'month');
          const isSelected = day.hasSame(selectedDate, 'day');
          const isWeekend = [6, 7].includes(day.weekday);
          const tooltipTitle = holidayName || vacationInfo || '';
          
          return (
            <Grid item xs={12/7} key={index} sx={{ textAlign: 'center', py: 0.25 }}>
              <Tooltip title={tooltipTitle} arrow placement="top">
                <CalendarDay
                  onClick={() => handleDateClick(day)}
                  className={isVacationDay ? 'disabled' : ''}
                  sx={getDayStyle(day, isSelected, isOutsideMonth, isHolidayDay, isVacationDay)}
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