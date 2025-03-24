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
import { useForm } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField, Button, Alert, Box, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { isWeekend } from '@/lib/client/holidayClient';
import { createVacationBooking } from '@/lib/client/vacationClient';
import { DateTime } from 'luxon';

interface VacationFormProps {
  userId: string;
  province: string;
  holidays: Array<{
    date: Date;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }>;
  onSuccess?: () => void;
}

interface FormValues {
  startDate: Date | null;
  endDate: Date | null;
  note: string;
}

export default function VacationForm({ userId, province, holidays, onSuccess }: VacationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormValues>({
    defaultValues: {
      startDate: null,
      endDate: null,
      note: '',
    }
  });
  
  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  
  // Create a map of bank holiday dates for efficient lookup
  const bankHolidayMap = new Map();
  holidays.forEach(holiday => {
    if (holiday.type === 'bank') {
      bankHolidayMap.set(DateTime.fromJSDate(holiday.date).toFormat('yyyy-MM-dd'), holiday.name);
    }
  });
  
  // Function to determine if a date is a bank holiday
  const isBankHoliday = (date: Date): boolean => {
    return bankHolidayMap.has(DateTime.fromJSDate(date).toFormat('yyyy-MM-dd'));
  };
  
  // Disable weekends and bank holidays in the date picker
  const shouldDisableDate = (date: DateTime) => {
    return isWeekend(date.toJSDate()) || isBankHoliday(date.toJSDate());
  };
  
  // Calculate vacation duration (excluding weekends and holidays)
  const calculateWorkingDays = () => {
    if (!watchStartDate || !watchEndDate) {
      return 0;
    }
    
    let days = 0;
    let current = new Date(watchStartDate);
    
    while (
      DateTime.fromJSDate(current) <= DateTime.fromJSDate(watchEndDate)
    ) {
      if (!isWeekend(current) && !isBankHoliday(current)) {
        days++;
      }
      current = DateTime.fromJSDate(current).plus({ days: 1 }).toJSDate();
    }
    return days;
  };
  
  const workingDays = calculateWorkingDays();
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!data.startDate || !data.endDate) {
      setError('Please select start and end dates');
      return;
    }
    if (DateTime.fromJSDate(data.startDate) > DateTime.fromJSDate(data.endDate)) {
      setError('Start date must be before end date');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createVacationBooking({
        userId,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note || null,
      });
      // Reset form and show success
      reset();
      setSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to book vacation. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <DatePicker
            label="Start Date"
            value={watchStartDate ? DateTime.fromJSDate(watchStartDate) : null}
            onChange={(date) => setValue('startDate', date ? date.toJSDate() : null)}
            shouldDisableDate={shouldDisableDate}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!errors.startDate,
                helperText: errors.startDate?.message,
              },
            }}
          />
          <Box sx={{ mt: 2 }}>
            <DatePicker
              label="End Date"
              value={watchEndDate ? DateTime.fromJSDate(watchEndDate) : null}
              onChange={(date) => setValue('endDate', date ? date.toJSDate() : null)}
              shouldDisableDate={shouldDisableDate}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.endDate,
                  helperText: errors.endDate?.message,
                },
              }}
            />
          </Box>
        </LocalizationProvider>
        <TextField
          label="Note (Optional)"
          multiline
          rows={3}
          fullWidth
          {...register('note')}
        />
        {workingDays > 0 && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            This will use {workingDays} working day{workingDays !== 1 ? 's' : ''} from your vacation allowance.
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Vacation booked successfully!
          </Alert>
        )}
        <Button 
          type="submit" 
          variant="contained" 
          disabled={isSubmitting}
          fullWidth
          sx={{ mt: 2 }}
        >
          {isSubmitting ? 'Booking...' : 'Book Vacation'}
        </Button>
      </div>
    </form>
  );
}