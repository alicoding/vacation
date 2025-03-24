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
function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let current = DateTime.fromJSDate(start);
  const endDate = DateTime.fromJSDate(end);
  
  while (current <= endDate) {
    days.push(current.toJSDate());
    current = current.plus({ days: 1 });
  }
  
  return days;
}

export default function MiniCalendar({ holidays = [], vacations = [] }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Convert holiday and vacation dates to Date objects for easier comparison
  const holidayDates = holidays.map(h => new Date(h.date).toDateString());
  const vacationDateRanges = vacations.map(v => ({
    start: new Date(v.start_date),
    end: new Date(v.end_date)
  }));
  
  // Check if a date is a holiday
  const isHoliday = (date: Date) => {
    return holidayDates.includes(date.toDateString());
  };
  
  // Check if a date is within a vacation
  const isVacation = (date: Date) => {
    return vacationDateRanges.some(range => 
      date >= range.start && date <= range.end
    );
  };
  
  // Get all days for the current month view
  const daysToDisplay = () => {
    // Get the first and last day of the month
    const monthStart = DateTime.fromJSDate(currentMonth).startOf('month').toJSDate();
    const monthEnd = DateTime.fromJSDate(currentMonth).endOf('month').toJSDate();
    
    // Get the start of the first week and end of the last week
    const calendarStart = DateTime.fromJSDate(monthStart).startOf('week').toJSDate();
    const calendarEnd = DateTime.fromJSDate(monthEnd).endOf('week').toJSDate();
    
    // Get all days in this range
    return eachDayOfInterval(calendarStart, calendarEnd);
  };
  
  // Navigation handlers
  const prevMonth = () => {
    setCurrentMonth(DateTime.fromJSDate(currentMonth).minus({ months: 1 }).toJSDate());
  };
  
  const nextMonth = () => {
    setCurrentMonth(DateTime.fromJSDate(currentMonth).plus({ months: 1 }).toJSDate());
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
          {DateTime.fromJSDate(currentMonth).toFormat('MMM yyyy')}
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
                color: !DateTime.fromJSDate(day).hasSame(DateTime.fromJSDate(currentMonth), 'month') 
                  ? 'text.disabled' 
                  : DateTime.fromJSDate(day).hasSame(DateTime.fromJSDate(selectedDate), 'day')
                  ? 'common.white'
                  : 'text.primary',
                backgroundColor: DateTime.fromJSDate(day).hasSame(DateTime.fromJSDate(selectedDate), 'day') 
                  ? 'primary.main' 
                  : 'transparent',
                border: isHoliday(day) 
                  ? '1px solid red' 
                  : isVacation(day)
                  ? '1px solid green'
                  : 'none'
              }}
            >
              {DateTime.fromJSDate(day).toFormat('d')}
            </CalendarDay>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}