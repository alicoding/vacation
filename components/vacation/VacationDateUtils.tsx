/**
 * Vacation date picker components and utilities.
 * These are shared across the vacation form for date selection with holiday handling.
 */
'use client';

import React, { JSX } from 'react';
import { DateTime } from 'luxon';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickersDayProps } from '@mui/x-date-pickers';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { Box, Tooltip } from '@mui/material';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import { CALENDAR_COLORS, CALENDAR_DAY_BORDER_RADIUS } from '@/lib/constants/colors';
import { Holiday } from '@/types';

// Utility function to check if a date is a bank holiday
export const isBankHoliday = (
  date: DateTime, 
  bankHolidayMap: Map<string, string>,
): boolean => {
  // Ensure we're using UTC for consistency
  const utcDate = date.toUTC().startOf('day');
  const dateStr = utcDate.toFormat('yyyy-MM-dd');
  return bankHolidayMap.has(dateStr);
};

// Utility function to generate bank holiday map for efficient lookup
export const generateBankHolidayMap = (holidays: any[]): Map<string, string> => {
  const map = new Map();
  
  holidays.forEach((holiday) => {
    if (holiday && holiday.type === 'bank') {
      // Create a DateTime object from the holiday date in UTC
      const holidayDate = typeof holiday.date === 'string'
        ? DateTime.fromISO(holiday.date, { zone: 'utc' })
        : DateTime.fromJSDate(holiday.date as Date, { zone: 'utc' });
      
      // Format as ISO date string for consistent lookup
      const dateStr = holidayDate.toFormat('yyyy-MM-dd');
      map.set(dateStr, holiday.name);
    }
  });
  
  return map;
};

interface DatePickerProps {
  name: string;
  label: string;
  value: DateTime | null;
  onChange: (date: DateTime | null) => void;
  shouldDisableDate: (date: DateTime) => boolean;
  renderDay: (props: PickersDayProps<DateTime>) => JSX.Element;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  minDate?: DateTime;
  error?: string;
}

export const VacationDatePicker: React.FC<DatePickerProps> = ({
  name,
  label,
  value,
  onChange,
  shouldDisableDate,
  renderDay,
  open,
  onOpen,
  onClose,
  minDate,
  error,
}) => {
  return (
    <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      shouldDisableDate={shouldDisableDate}
      minDate={minDate}
      slots={{
        day: renderDay,
      }}
      slotProps={{
        textField: {
          fullWidth: true,
          error: !!error,
          helperText: error,
          InputProps: {
            startAdornment: (
              <Box position="relative" sx={{ mr: 1 }}>
                <CalendarMonth color="action" fontSize="small" />
              </Box>
            ),
          },
        },
      }}
      open={open}
      onOpen={onOpen}
      onClose={onClose}
    />
  );
};

interface RenderDayProps {
  bankHolidayMap: Map<string, string>;
  existingVacations: Array<{
    start_date: Date | string;
    end_date: Date | string;
    is_half_day?: boolean;
  }>;
}

// Factory function to create a renderDay function with the required context
export const createRenderDay = ({ bankHolidayMap, existingVacations }: RenderDayProps) => {
  // Custom day renderer for DatePicker to highlight holidays and booked days
  return (props: PickersDayProps<DateTime>) => {
    const { day, outsideCurrentMonth, selected, ...other } = props;
    
    // Normalize the day to start of day for consistent comparison
    const normalizedDay = day.startOf('day');
    
    // Check if the day is a bank holiday
    const isHoliday = isBankHoliday(normalizedDay, bankHolidayMap);
    
    // Debug existingVacations if available to ensure proper processing
    if (existingVacations && existingVacations.length > 0 && normalizedDay.day === 1) {
      console.log('Processing vacation dates in renderDay:', existingVacations.length, 'vacations');
    }
    
    // Check if the day is already booked as vacation
    const isVacation = existingVacations.some((vacation) => {
      // Convert start_date to Luxon DateTime with consistent normalization
      let startDate;
      if (typeof vacation.start_date === 'string') {
        startDate = DateTime.fromISO(vacation.start_date).startOf('day');
      } else if (vacation.start_date instanceof Date) {
        startDate = DateTime.fromJSDate(vacation.start_date).startOf('day');
      } else {
        console.warn('Unexpected start_date type:', vacation.start_date);
        return false;
      }
      
      // Convert end_date to Luxon DateTime with consistent normalization
      let endDate;
      if (typeof vacation.end_date === 'string') {
        endDate = DateTime.fromISO(vacation.end_date).startOf('day');
      } else if (vacation.end_date instanceof Date) {
        endDate = DateTime.fromJSDate(vacation.end_date).startOf('day');
      } else {
        console.warn('Unexpected end_date type:', vacation.end_date);
        return false;
      }
      
      // Additional debug for specific dates to troubleshoot comparison issues
      if (normalizedDay.day === 15 && normalizedDay.month === DateTime.now().month) {
        console.log('Checking day:', normalizedDay.toISODate(), 
          'against vacation:', startDate.toISODate(), 'to', endDate.toISODate(),
          'Result:', normalizedDay >= startDate && normalizedDay <= endDate);
      }
      
      // Check if the day is within the vacation range (inclusive)
      return normalizedDay >= startDate && normalizedDay <= endDate;
    });
    
    // Define the tooltip text based on the day type
    let tooltipTitle = '';
    if (isHoliday) {
      tooltipTitle = bankHolidayMap.get(normalizedDay.toUTC().toFormat('yyyy-MM-dd')) || 'Holiday';
    } else if (isVacation) {
      tooltipTitle = 'Already booked vacation';
    }
    
    // Calculate if the day should be disabled based on vacation booking
    const isDisabled = isVacation || other.disabled;
    
    // This component needs to be wrapped in a span for the tooltip to work with disabled elements
    return (
      <Tooltip title={tooltipTitle} arrow placement="top">
        <span>
          <PickersDay
            {...other}
            day={day}
            outsideCurrentMonth={outsideCurrentMonth}
            selected={selected}
            disabled={isDisabled}
            sx={{
              ...(isHoliday && {
                backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
                color: CALENDAR_COLORS.HOLIDAY.TEXT,
                '&:hover': {
                  backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
                },
                borderRadius: CALENDAR_DAY_BORDER_RADIUS,
              }),
              ...(isVacation && !isHoliday && {
                backgroundColor: CALENDAR_COLORS.VACATION.FULL_DAY,
                color: CALENDAR_COLORS.VACATION.TEXT,
                '&:hover': {
                  backgroundColor: CALENDAR_COLORS.VACATION.FULL_DAY,
                },
                borderRadius: CALENDAR_DAY_BORDER_RADIUS,
                opacity: 0.9,
                pointerEvents: 'none',
              }),
            }}
          />
        </span>
      </Tooltip>
    );
  };
};

// Factory function to create a shouldDisableDate function with the required context
export const createShouldDisableDate = (
  bankHolidayMap: Map<string, string>,
  existingVacations: Array<{
    start_date: Date | string;
    end_date: Date | string;
    is_half_day?: boolean;
  }>,
) => {
  return (date: DateTime) => {
    // Normalize the date to start of day for consistent comparison
    const normalizedDate = date.startOf('day');
    
    // Luxon weekdays are 1-7 where 6=Saturday, 7=Sunday
    const isWeekendDay = normalizedDate.weekday >= 6;
    
    // Check if the day is already booked as vacation with robust type handling
    const isVacation = existingVacations.some((vacation) => {
      // Convert start_date to Luxon DateTime with type checking
      let startDate;
      if (typeof vacation.start_date === 'string') {
        startDate = DateTime.fromISO(vacation.start_date).startOf('day');
      } else if (vacation.start_date instanceof Date) {
        startDate = DateTime.fromJSDate(vacation.start_date).startOf('day');
      } else {
        console.warn('Invalid start_date format:', vacation.start_date);
        return false;
      }
      
      // Convert end_date to Luxon DateTime with type checking
      let endDate;
      if (typeof vacation.end_date === 'string') {
        endDate = DateTime.fromISO(vacation.end_date).startOf('day');
      } else if (vacation.end_date instanceof Date) {
        endDate = DateTime.fromJSDate(vacation.end_date).startOf('day');
      } else {
        console.warn('Invalid end_date format:', vacation.end_date);
        return false;
      }
      
      // Debug vacation date handling
      // console.log('Comparing:', normalizedDate.toISO(), 'with vacation:', startDate.toISO(), '-', endDate.toISO());
        
      // Check if the date falls within the vacation period (inclusive)
      return normalizedDate >= startDate && normalizedDate <= endDate;
    });
    
    // Disable weekends and already booked vacation days
    return isWeekendDay || isVacation;
  };
};

export { CALENDAR_COLORS };
