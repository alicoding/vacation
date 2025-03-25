/**
 * VacationSummary Component
 *
 * Displays a summary of vacation days calculation with proper formatting
 * and a detailed breakdown of days (working days, weekends, holidays).
 * This component fixes the decimal display issues in day calculations.
 *
 * @param {VacationSummaryProps} props - The props passed to the component
 * @returns {JSX.Element} A component displaying vacation day calculations
 */
'use client';

import { 
  Box, Typography, Paper, Divider, 
  Table, TableBody, TableCell, TableContainer, 
  TableRow, Chip, Tooltip, Alert
} from '@mui/material';
import { DateTime, Interval } from 'luxon';
import { VacationBooking, Holiday } from '@/types';

interface VacationSummaryProps {
  startDate: Date | string | null;
  endDate: Date | string | null;
  isHalfDay?: boolean;
  halfDayPortion?: string | null;
  halfDayDate?: Date | null;
  halfDayDates?: Array<{
    date: Date;
    portion: string;
  }>;
  workingDays?: number;
  holidays: Array<{
    date: Date;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }>;
}

export default function VacationSummary({ 
  startDate, 
  endDate, 
  isHalfDay = false,
  halfDayPortion = null,
  halfDayDate = null,
  halfDayDates = [],
  workingDays,
  holidays 
}: VacationSummaryProps) {
  // Return early if no dates provided
  if (!startDate || !endDate) {
    return null;
  }
  
  // Parse dates to DateTime objects
  const start = typeof startDate === 'string' 
    ? DateTime.fromISO(startDate) 
    : DateTime.fromJSDate(startDate);
  
  const end = typeof endDate === 'string' 
    ? DateTime.fromISO(endDate) 
    : DateTime.fromJSDate(endDate);
  
  // Check if dates are valid
  if (!start.isValid || !end.isValid) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography color="error">
          Invalid date range provided
        </Typography>
      </Paper>
    );
  }
  
  // Calculate total days (including weekends and holidays)
  const totalDays = Interval.fromDateTimes(
    start,
    end.plus({ days: 1 })
  ).length('days');
  
  // Count weekends
  let weekendDays = 0;
  let current = start;
  while (current <= end) {
    if (current.weekday > 5) { // 6 = Saturday, 7 = Sunday in Luxon
      weekendDays++;
    }
    current = current.plus({ days: 1 });
  }
  
  // Find holidays in the date range
  const holidaysInRange = holidays.filter(holiday => {
    // Create DateTime with explicit UTC to prevent timezone issues
    const holidayDate = typeof holiday.date === 'string'
      ? DateTime.fromISO(holiday.date, { zone: 'utc' })
      : DateTime.fromJSDate(holiday.date, { zone: 'utc' });
    
    // Ensure we're comparing the date part only (no time component)
    const holidayDateOnly = holidayDate.startOf('day');
    const startDateOnly = start.startOf('day');
    const endDateOnly = end.startOf('day');
    
    // Check if the holiday is within the date range
    return holidayDateOnly >= startDateOnly && holidayDateOnly <= endDateOnly;
  });
  
  // Count holidays (excluding weekends)
  const holidayDays = holidaysInRange.filter(holiday => {
    // Create DateTime with explicit UTC to prevent timezone issues
    const holidayDate = typeof holiday.date === 'string'
      ? DateTime.fromISO(holiday.date, { zone: 'utc' })
      : DateTime.fromJSDate(holiday.date, { zone: 'utc' });
    
    // Only count holidays that aren't on weekends
    return holidayDate.weekday <= 5;
  }).length;
  
  // Calculate working days (excluding weekends and holidays)
  let workingDaysCalculated = totalDays - weekendDays - holidayDays;
  
  // Adjust for half-day if applicable
  if (isHalfDay) {
    // If single day, it's just 0.5 days
    if (start.hasSame(end, 'day')) {
      workingDaysCalculated = 0.5;
    } else {
      // Otherwise, subtract half a day
      workingDaysCalculated -= 0.5;
    }
  }
  
  // Use provided workingDays if available, otherwise use calculated value
  const effectiveWorkingDays = workingDays !== undefined ? workingDays : workingDaysCalculated;
  
  // Format the workingDays to 1 decimal place, and remove the decimal if it's a whole number
  const formattedWorkingDays = effectiveWorkingDays % 1 === 0 
    ? effectiveWorkingDays.toString() 
    : effectiveWorkingDays.toFixed(1);
  
  // Check if this is a long weekend or connected to holidays
  const dayBeforeStart = start.minus({ days: 1 });
  const dayAfterEnd = end.plus({ days: 1 });
  
  const isWeekendDay = (date: DateTime) => date.weekday > 5;
  const isHolidayDay = (date: DateTime) => holidays.some(holiday => {
    const holidayDate = typeof holiday.date === 'string'
      ? DateTime.fromISO(holiday.date)
      : DateTime.fromJSDate(holiday.date);
    return date.hasSame(holidayDate, 'day');
  });
  
  const hasAdjacentWeekend = isWeekendDay(dayBeforeStart) || isWeekendDay(dayAfterEnd);
  
  const adjacentHolidays = holidays.filter(holiday => {
    const holidayDate = typeof holiday.date === 'string'
      ? DateTime.fromISO(holiday.date)
      : DateTime.fromJSDate(holiday.date);
    
    return holidayDate.hasSame(dayBeforeStart, 'day') || holidayDate.hasSame(dayAfterEnd, 'day');
  });
  
  const hasAdjacentHolidays = adjacentHolidays.length > 0;
  
  // Calculate extended time off
  let extendedTimeOff = totalDays;
  let extendedTimeOffMessage = null;
  
  if (hasAdjacentWeekend || hasAdjacentHolidays) {
    // Count extra days from adjacent weekends
    if (hasAdjacentWeekend) {
      // If weekend before
      if (isWeekendDay(dayBeforeStart)) {
        // If previous day is Sunday, add 2 days (both Saturday and Sunday)
        if (dayBeforeStart.weekday === 7) {
          extendedTimeOff += 2;
        } 
        // If previous day is Saturday, add 2 days (both Saturday and Sunday)
        else if (dayBeforeStart.weekday === 6) {
          extendedTimeOff += 2;
        }
      }
      
      // If weekend after
      if (isWeekendDay(dayAfterEnd)) {
        // If next day is Saturday, add 2 days (both Saturday and Sunday)
        if (dayAfterEnd.weekday === 6) {
          extendedTimeOff += 2;
        } 
        // If next day is Sunday, add 1 day (only Sunday)
        else if (dayAfterEnd.weekday === 7) {
          extendedTimeOff += 1;
        }
      }
    }
    
    // Count extra days from adjacent holidays
    if (hasAdjacentHolidays) {
      extendedTimeOff += adjacentHolidays.length;
    }
    
    // Create the message
    if (hasAdjacentWeekend && hasAdjacentHolidays) {
      extendedTimeOffMessage = `With weekends and holidays, you'll have ${extendedTimeOff} total days off!`;
    } else if (hasAdjacentWeekend) {
      extendedTimeOffMessage = `With weekend, you'll have ${extendedTimeOff} total days off!`;
    } else if (hasAdjacentHolidays) {
      extendedTimeOffMessage = `With adjacent holidays, you'll have ${extendedTimeOff} total days off!`;
    }
  }
  
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
      <Typography variant="h6" gutterBottom>
        Vacation Summary
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Date Range:
        </Typography>
        <Typography variant="body1">
          {start.toFormat('LLL d, yyyy')} - {end.toFormat('LLL d, yyyy')}
          
          {/* Show single half-day chip for backward compatibility */}
          {isHalfDay && halfDayDates.length === 0 && (
            <Chip 
              size="small" 
              label={
                halfDayPortion 
                  ? (halfDayDate && !start.hasSame(end, 'day')
                      ? `Half-day (${halfDayPortion}) on ${DateTime.fromJSDate(halfDayDate as Date).toFormat('LLL d')}`
                      : `Half-day (${halfDayPortion})`)
                  : "Half-day"
              } 
              sx={{ ml: 1 }} 
            />
          )}
        </Typography>
        
        {/* Show multiple half-day chips if available */}
        {isHalfDay && halfDayDates.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
            {halfDayDates.map((halfDay, index) => (
              <Chip 
                key={index}
                size="small" 
                label={`Half-day (${halfDay.portion}) on ${DateTime.fromJSDate(halfDay.date).toFormat('LLL d')}`}
                sx={{ mr: 0.5, mb: 0.5 }} 
              />
            ))}
          </Box>
        )}
      </Box>
      
      {extendedTimeOffMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {extendedTimeOffMessage}
        </Alert>
      )}
      
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2">Total Days Off</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">{totalDays} days</Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2">Weekend Days</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{weekendDays} days</Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell component="th" scope="row">
                <Typography variant="body2">Holidays</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{holidayDays} days</Typography>
              </TableCell>
            </TableRow>
            
            <TableRow>
              <TableCell component="th" scope="row" sx={{ borderBottom: 'none' }}>
                <Tooltip title="The number of working days that will be deducted from your vacation balance">
                  <Typography variant="body2" fontWeight="medium">Working Days Used</Typography>
                </Tooltip>
              </TableCell>
              <TableCell align="right" sx={{ borderBottom: 'none' }}>
                <Typography variant="body1" fontWeight="medium" color="primary.main">
                  {formattedWorkingDays} days
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      {holidaysInRange.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Holidays during this period:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {holidaysInRange.map((holiday, index) => {
              // Create DateTime with explicit UTC to prevent timezone issues
              const holidayDate = typeof holiday.date === 'string'
                ? DateTime.fromISO(holiday.date, { zone: 'utc' })
                : DateTime.fromJSDate(holiday.date, { zone: 'utc' });
              
              return (
                <Chip
                  key={index}
                  size="small"
                  label={`${holiday.name} (${holidayDate.toFormat('LLL d')})`}
                  color="warning"
                  variant="outlined"
                  sx={{ mb: 0.5 }}
                />
              );
            })}
          </Box>
        </Box>
      )}
      
      {(hasAdjacentWeekend || hasAdjacentHolidays) && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Adjacent days off:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {isWeekendDay(dayBeforeStart) && (
              <Chip
                size="small"
                label={`Weekend before (${dayBeforeStart.toFormat('EEE, LLL d')})`}
                color="success"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            )}
            
            {isWeekendDay(dayAfterEnd) && (
              <Chip
                size="small"
                label={`Weekend after (${dayAfterEnd.toFormat('EEE, LLL d')})`}
                color="success"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            )}
            
            {adjacentHolidays.map((holiday, index) => {
              // Create DateTime with explicit UTC to prevent timezone issues
              const holidayDate = typeof holiday.date === 'string'
                ? DateTime.fromISO(holiday.date, { zone: 'utc' })
                : DateTime.fromJSDate(holiday.date, { zone: 'utc' });
              
              return (
                <Chip
                  key={index}
                  size="small"
                  label={`${holiday.name} (${holidayDate.toFormat('LLL d')})`}
                  color="warning"
                  variant="outlined"
                  sx={{ mb: 0.5 }}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
} 