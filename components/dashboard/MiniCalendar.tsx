'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import { DateTime, Interval } from 'luxon';
import { Holiday, VacationBooking } from '@/types';
import { styled } from '@mui/material/styles';
import ChevronLeftIcon from '@heroicons/react/24/outline/ChevronLeftIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';

interface MiniCalendarProps {
  holidays?: Holiday[];
  vacations?: VacationBooking[];
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

export default function MiniCalendar({ holidays = [], vacations = [] }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(DateTime.now());
  const [selectedDate, setSelectedDate] = useState(DateTime.now());
  
  // Parse holiday dates using Luxon DateTime with UTC
  const holidayDates = holidays.map(h => {
    // Create a DateTime from the holiday date string
    return typeof h.date === 'string' 
      ? DateTime.fromISO(h.date, { zone: 'utc' }) 
      : DateTime.fromJSDate(h.date as Date, { zone: 'utc' });
  });
  
  // Parse vacation date ranges using Luxon DateTime
  const vacationDateRanges = vacations.map(v => {
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
    return holidayDates.some(holidayDate => 
      date.hasSame(holidayDate, 'day')
    );
  };
  
  // Check if a date is within a vacation
  const isVacation = (date: DateTime): boolean => {
    return vacationDateRanges.some(range => 
      date >= range.start && date <= range.end
    );
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
        {daysToDisplay().map((day, index) => (
          <Grid item xs={12/7} key={index} sx={{ textAlign: 'center', py: 0.25 }}>
            <CalendarDay
              onClick={() => setSelectedDate(day)}
              sx={{
                margin: '0 auto',
                color: !day.hasSame(currentMonth, 'month') 
                  ? 'text.disabled' 
                  : day.hasSame(selectedDate, 'day')
                    ? 'common.white'
                    : 'text.primary',
                backgroundColor: day.hasSame(selectedDate, 'day') 
                  ? 'primary.main' 
                  : 'transparent',
                border: isHoliday(day) 
                  ? '1px solid red' 
                  : isVacation(day)
                    ? '1px solid green'
                    : 'none'
              }}
            >
              {day.toFormat('d')}
            </CalendarDay>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}