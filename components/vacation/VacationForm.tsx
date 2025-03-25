/**
 * VacationForm Component for booking vacations.
 *
 * This component provides a form for users to select a start date, end date,
 * and add an optional note when booking a vacation. It integrates with
 * the `react-hook-form` library for form management and uses Material-UI
 * components for the user interface.  It also prevents booking on weekends
 * and bank holidays.
 *
 * @param {VacationFormProps} props - The properties passed to the component.
 * @returns {JSX.Element} A form for booking vacations.
 */
'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  TextField, Button, Alert, Box, Typography,
  FormControlLabel, Checkbox, FormHelperText, 
  Stack, InputLabel, Paper, Grid, Dialog, Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTime, Interval } from 'luxon';
import { isWeekend } from '@/lib/client/holidayClient';
import { createVacationBooking } from '@/lib/client/vacationClient';
import VacationSummary from '@/components/vacation/VacationSummary';
import { useRouter } from 'next/navigation';
import { PickersDayProps } from '@mui/x-date-pickers';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
import { CALENDAR_COLORS, CALENDAR_DAY_BORDER_RADIUS } from '@/lib/constants/colors';
import CalendarMonth from '@mui/icons-material/CalendarMonth';

interface VacationFormProps {
  userId: string;
  province: string;
  holidays: Array<{
    date: Date;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }>;
  existingVacations?: Array<{
    start_date: Date;
    end_date: Date;
    is_half_day?: boolean;
  }>;
  onSuccess?: () => void;
}

interface FormValues {
  startDate: DateTime | null;
  endDate: DateTime | null;
  note: string;
  isHalfDay: boolean;
  halfDayPortion: string;
  halfDayDate: DateTime | null;
  halfDayDates: Record<string, {isHalfDay: boolean, portion: string}>;
}

export default function VacationForm({ userId, province, holidays, existingVacations = [], onSuccess }: VacationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  const { register, handleSubmit, control, formState: { errors }, watch, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      startDate: null,
      endDate: null,
      note: '',
      isHalfDay: false,
      halfDayPortion: 'AM',
      halfDayDate: null,
      halfDayDates: {},
    }
  });
  
  const watchIsHalfDay = watch('isHalfDay');
  const watchHalfDayPortion = watch('halfDayPortion');
  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchHalfDayDate = watch('halfDayDate');
  const watchHalfDayDates = watch('halfDayDates');
  
  // Create a map of bank holiday dates for efficient lookup
  const bankHolidayMap = new Map();
  holidays.forEach(holiday => {
    if (holiday.type === 'bank') {
      // Create a DateTime object from the holiday date in UTC
      const holidayDate = typeof holiday.date === 'string'
        ? DateTime.fromISO(holiday.date, { zone: 'utc' })
        : DateTime.fromJSDate(holiday.date, { zone: 'utc' });
      
      // Format as ISO date string for consistent lookup
      const dateStr = holidayDate.toFormat('yyyy-MM-dd');
      bankHolidayMap.set(dateStr, holiday.name);
    }
  });
  
  // Function to determine if a date is a bank holiday
  const isBankHoliday = (date: DateTime): boolean => {
    // Ensure we're using UTC for consistency
    const utcDate = date.toUTC().startOf('day');
    const dateStr = utcDate.toFormat('yyyy-MM-dd');
    return bankHolidayMap.has(dateStr);
  };
  
  // Function to determine if a date should be disabled
  const shouldDisableDate = (date: DateTime) => {
    // Luxon weekdays are 1-7 where 6=Saturday, 7=Sunday
    const isWeekendDay = date.weekday >= 6;
    
    // Check if the day is already booked as vacation
    const isAlreadyBooked = existingVacations.some(vacation => {
      const startDate = typeof vacation.start_date === 'string'
        ? DateTime.fromISO(vacation.start_date)
        : DateTime.fromJSDate(vacation.start_date);
        
      const endDate = typeof vacation.end_date === 'string'
        ? DateTime.fromISO(vacation.end_date)
        : DateTime.fromJSDate(vacation.end_date);
      
      // Check if the day is within the vacation range
      return date >= startDate.startOf('day') && date <= endDate.endOf('day');
    });
    
    // Disable both weekends and already booked days
    return isWeekendDay || isAlreadyBooked;
  };
  
  // Custom day renderer for DatePicker to highlight holidays and booked days
  const renderDay = (props: PickersDayProps<DateTime>) => {
    const { day, ...other } = props;
    const isHoliday = isBankHoliday(day);
    
    // Check if the day is already booked as vacation
    const isBooked = existingVacations.some(vacation => {
      const startDate = typeof vacation.start_date === 'string'
        ? DateTime.fromISO(vacation.start_date)
        : DateTime.fromJSDate(vacation.start_date);
        
      const endDate = typeof vacation.end_date === 'string'
        ? DateTime.fromISO(vacation.end_date)
        : DateTime.fromJSDate(vacation.end_date);
      
      // Check if the day is within the vacation range
      return day >= startDate.startOf('day') && day <= endDate.endOf('day');
    });
    
    // Define the tooltip text based on the day type
    let tooltipTitle = '';
    if (isHoliday) {
      tooltipTitle = bankHolidayMap.get(day.toUTC().toFormat('yyyy-MM-dd')) || 'Holiday';
    } else if (isBooked) {
      tooltipTitle = 'Already booked';
    }
    
    return (
      <Tooltip
        title={tooltipTitle}
        arrow
      >
        <PickersDay
          {...props}
          sx={{
            ...(isHoliday && {
              backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
              color: '#fff',
              '&:hover': {
                backgroundColor: CALENDAR_COLORS.HOLIDAY.BANK,
              },
              borderRadius: CALENDAR_DAY_BORDER_RADIUS
            }),
            ...(isBooked && !isHoliday && {
              backgroundColor: CALENDAR_COLORS.VACATION.FULL_DAY,
              color: '#fff',
              '&:hover': {
                backgroundColor: CALENDAR_COLORS.VACATION.FULL_DAY,
              },
              borderRadius: CALENDAR_DAY_BORDER_RADIUS
            })
          }}
        />
      </Tooltip>
    );
  };
  
  // Handle start date selection - automatically focus end date picker
  const handleStartDateChange = (date: DateTime | null) => {
    setValue('startDate', date);
    
    if (date) {
      // If end date is before start date, reset it
      if (watchEndDate && watchEndDate < date) {
        setValue('endDate', null);
      }
      
      // Close the start date picker
      setStartDateOpen(false);
      
      // If it's a weekend/holiday, find the next available date
      let suggestedEndDate = date.plus({ days: 1 });
      while (shouldDisableDate(suggestedEndDate)) {
        suggestedEndDate = suggestedEndDate.plus({ days: 1 });
      }
      
      // If no end date is set yet, set a suggested end date
      if (!watchEndDate) {
        setValue('endDate', suggestedEndDate);
      }
      
      // Open the end date picker after a short delay
      setTimeout(() => {
        setEndDateOpen(true);
      }, 100);
    }
  };
  
  // Handle end date selection
  const handleEndDateChange = (date: DateTime | null) => {
    setValue('endDate', date);
    if (date) {
      // Simply close the end date picker
      setEndDateOpen(false);
    }
  };
  
  // Generate the list of working days for half-day selection
  const getWorkingDays = () => {
    const startDate = watchStartDate;
    const endDate = watchEndDate;
    if (!startDate || !endDate) {
      return [];
    }
    
    const workingDays = [];
    
    // Iterate through each day in the interval
    let currentDate = startDate.startOf('day');
    while (currentDate <= endDate) {
      if (!shouldDisableDate(currentDate)) {
        workingDays.push(currentDate);
      }
      currentDate = currentDate.plus({ days: 1 });
    }
    
    return workingDays;
  };
  
  // Use this to determine if multiple working days are selected
  const workingDays = getWorkingDays();
  const hasMultipleWorkingDays = workingDays.length > 1;
  
  // Initialize halfDayDates when workingDays change
  React.useEffect(() => {
    if (workingDays.length > 0) {
      // Create default half-day settings for each working day
      const halfDaySettings: Record<string, {isHalfDay: boolean, portion: string}> = {};
      
      workingDays.forEach(day => {
        const dateKey = day.toISODate();
        if (dateKey && !watchHalfDayDates[dateKey]) {
          halfDaySettings[dateKey] = { isHalfDay: false, portion: 'AM' };
        }
      });
      
      // Only update if there are new days
      if (Object.keys(halfDaySettings).length > 0) {
        setValue('halfDayDates', { ...watchHalfDayDates, ...halfDaySettings });
      }
    }
  }, [workingDays, setValue, watchHalfDayDates]);
  
  // Toggle half-day for a specific date
  const toggleHalfDay = (dateKey: string) => {
    const currentSettings = watchHalfDayDates[dateKey];
    if (currentSettings) {
      const newHalfDayDates = { ...watchHalfDayDates };
      newHalfDayDates[dateKey] = { 
        ...currentSettings,
        isHalfDay: !currentSettings.isHalfDay 
      };
      setValue('halfDayDates', newHalfDayDates);
    }
  };
  
  // Set half-day portion for a specific date
  const setHalfDayPortion = (dateKey: string, portion: string) => {
    const currentSettings = watchHalfDayDates[dateKey];
    if (currentSettings) {
      const newHalfDayDates = { ...watchHalfDayDates };
      newHalfDayDates[dateKey] = { 
        ...currentSettings,
        portion 
      };
      setValue('halfDayDates', newHalfDayDates);
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    const { startDate, endDate } = data;
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Prepare half-day dates for submission
      const halfDayDates = data.isHalfDay 
        ? Object.entries(data.halfDayDates)
            .filter(([_, settings]) => settings.isHalfDay)
            .map(([dateStr, settings]) => ({
              date: DateTime.fromISO(dateStr).toJSDate(),
              portion: settings.portion
            }))
        : [];
      
      await createVacationBooking({
        userId,
        startDate: startDate.toJSDate(),
        endDate: endDate.toJSDate(),
        note: data.note || null,
        isHalfDay: data.isHalfDay || false,
        halfDayPortion: data.isHalfDay ? data.halfDayPortion : null,
        halfDayDate: data.isHalfDay && data.halfDayDate ? data.halfDayDate.toJSDate() : null,
        halfDayDates: halfDayDates,
      });
      
      setSuccess(true);
      reset();
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      // Check if it's a validation error specifically for overlapping dates
      if (err instanceof Error && err.message.includes('overlaps')) {
        setError(err.message);
      } else {
        setError('Failed to book vacation. Please try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Determine if it's a single day vacation
  const isSingleDay = watchStartDate && 
                      watchEndDate && 
                      watchStartDate.hasSame(watchEndDate, 'day');
  
  // Calculate vacation duration (excluding weekends and holidays)
  const calculateWorkingDays = () => {
    const startDate = watchStartDate;
    const endDate = watchEndDate;
    if (!startDate || !endDate) {
      return 0;
    }
    
    let days = 0;
    
    // Create an interval between the dates
    const interval = Interval.fromDateTimes(startDate.startOf('day'), endDate.endOf('day'));
    
    // Iterate through each day in the interval
    let currentDate = startDate.startOf('day');
    while (currentDate <= endDate) {
      // Only count weekdays (not weekends)
      if (![6, 7].includes(currentDate.weekday)) {
        days++;
      }
      currentDate = currentDate.plus({ days: 1 });
    }
    
    // Adjust for multiple half days if applicable
    if (watchIsHalfDay) {
      // Count how many half days are selected
      const halfDayCount = Object.values(watchHalfDayDates).filter(day => day.isHalfDay).length;
      if (halfDayCount > 0) {
        days -= halfDayCount * 0.5;
      } else {
        // Fallback to old behavior if no specific days are selected
        days -= 0.5;
      }
    }
    
    return days;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Controller
              name="startDate"
              control={control}
              rules={{ required: 'Start date is required' }}
              render={({ field }) => (
                <DatePicker
                  label="Start Date"
                  value={field.value}
                  onChange={(newValue) => handleStartDateChange(newValue)}
                  shouldDisableDate={shouldDisableDate}
                  slots={{
                    day: renderDay
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate?.message as string,
                      InputProps: {
                        startAdornment: (
                          <Box position="relative" sx={{ mr: 1 }}>
                            <CalendarMonth color="action" fontSize="small" />
                          </Box>
                        )
                      }
                    }
                  }}
                  open={startDateOpen}
                  onOpen={() => setStartDateOpen(true)}
                  onClose={() => setStartDateOpen(false)}
                />
              )}
            />
            
            <Controller
              name="endDate"
              control={control}
              rules={{ required: 'End date is required' }}
              render={({ field }) => (
                <DatePicker
                  label="End Date"
                  value={field.value}
                  onChange={(newValue) => handleEndDateChange(newValue)}
                  shouldDisableDate={shouldDisableDate}
                  minDate={watchStartDate || undefined}
                  slots={{
                    day: renderDay
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.endDate,
                      helperText: errors.endDate?.message as string,
                      InputProps: {
                        startAdornment: (
                          <Box position="relative" sx={{ mr: 1 }}>
                            <CalendarMonth color="action" fontSize="small" />
                          </Box>
                        )
                      }
                    }
                  }}
                  open={endDateOpen}
                  onOpen={() => setEndDateOpen(true)}
                  onClose={() => setEndDateOpen(false)}
                />
              )}
            />
          </Box>
        </LocalizationProvider>
        
        <Controller
          name="isHalfDay"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Checkbox 
                checked={field.value} 
                onChange={field.onChange} 
              />}
              label="Enable half-day vacation(s)"
            />
          )}
        />
        
        {watchIsHalfDay && hasMultipleWorkingDays && (
          <Box sx={{ mt: 1, mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" gutterBottom>
              Select which days should be half-days:
            </Typography>
            
            {workingDays.map((day) => {
              const dateKey = day.toISODate();
              const daySettings = dateKey ? watchHalfDayDates[dateKey] : undefined;
              
              return dateKey && daySettings ? (
                <Box key={dateKey} sx={{ mb: 1, ml: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={daySettings.isHalfDay}
                        onChange={() => toggleHalfDay(dateKey)}
                      />
                    }
                    label={day.toFormat('EEE, MMM d, yyyy')}
                  />
                  
                  {daySettings.isHalfDay && (
                    <Box sx={{ ml: 4, mt: 0.5 }}>
                      <FormControlLabel
                        control={
                          <input
                            type="radio"
                            checked={daySettings.portion === "AM"}
                            onChange={() => setHalfDayPortion(dateKey, "AM")}
                          />
                        }
                        label="Morning (AM)"
                      />
                      <FormControlLabel
                        control={
                          <input
                            type="radio"
                            checked={daySettings.portion === "PM"}
                            onChange={() => setHalfDayPortion(dateKey, "PM")}
                          />
                        }
                        label="Afternoon (PM)"
                      />
                    </Box>
                  )}
                </Box>
              ) : null;
            })}
          </Box>
        )}
        
        {watchIsHalfDay && !hasMultipleWorkingDays && (
          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select half-day portion:
            </Typography>
            <Controller
              name="halfDayPortion"
              control={control}
              render={({ field }) => (
                <Box>
                  <FormControlLabel
                    control={
                      <input
                        type="radio"
                        {...field}
                        value="AM"
                        checked={field.value === "AM"}
                      />
                    }
                    label="Morning (AM)"
                  />
                  <FormControlLabel
                    control={
                      <input
                        type="radio"
                        {...field}
                        value="PM"
                        checked={field.value === "PM"}
                      />
                    }
                    label="Afternoon (PM)"
                  />
                </Box>
              )}
            />
          </Box>
        )}
        
        {isSingleDay && !watchIsHalfDay && (
          <FormHelperText>
            For a single day, consider selecting the "Enable half-day vacation(s)" option if you're only taking half a day off.
          </FormHelperText>
        )}
        
        <TextField
          label="Note (Optional)"
          fullWidth
          multiline
          rows={2}
          placeholder="Add any details about your vacation..."
          {...register('note')}
        />
        
        {/* Display summary of selected dates */}
        {(watchStartDate && watchEndDate) && (
          <VacationSummary 
            startDate={watchStartDate.toJSDate()} 
            endDate={watchEndDate.toJSDate()} 
            workingDays={calculateWorkingDays()}
            isHalfDay={watchIsHalfDay}
            halfDayPortion={watchHalfDayPortion}
            halfDayDate={watchHalfDayDate ? watchHalfDayDate.toJSDate() : undefined}
            halfDayDates={Object.entries(watchHalfDayDates)
              .filter(([_, settings]) => settings.isHalfDay)
              .map(([dateStr, settings]) => ({
                date: DateTime.fromISO(dateStr).toJSDate(),
                portion: settings.portion
              }))}
            holidays={holidays}
          />
        )}
        
        {/* Error and success messages */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Vacation booked successfully!
          </Alert>
        )}
        
        <Box sx={{ mt: 3 }}>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting || !watchStartDate || !watchEndDate}
            sx={{ mr: 2 }}
          >
            {isSubmitting ? 'Booking...' : 'Book Vacation'}
          </Button>
          
          <Button 
            type="button" 
            onClick={() => {
              reset();
            }}
          >
            Reset
          </Button>
        </Box>
      </div>
    </form>
  );
}