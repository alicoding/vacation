/**
 * VacationForm Component for booking vacations.
 *
 * This component provides a form for users to select a start date, end date,
 * and add an optional note when booking a vacation.
 */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  TextField,
  Button,
  Alert,
  Box,
  Container,
  FormHelperText,
  Grid,
  Paper,
  Typography,
  InputAdornment,
  IconButton,
  Popover,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime, Interval } from 'luxon';
import { useRouter } from 'next/navigation';
import useHolidays from '@/lib/hooks/useHolidays';
import { createVacationBooking } from '@/lib/client/vacationClient';
import VacationSummary from './VacationSummary';
import HalfDaySettings, { HalfDayOption } from './HalfDaySettings';
import HolidayDisplay from './HolidayDisplay';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MiniCalendar from '@/components/dashboard/MiniCalendar';
import {
  generateBankHolidayMap,
  createShouldDisableDate,
} from './VacationDateUtils';
import { CALENDAR_COLORS } from '@/lib/constants/colors';
import { Holiday, VacationBooking } from '@/types';

interface VacationFormProps {
  userId: string;
  province: string;
  holidays: {
    date: Date | string;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }[];
  existingVacations?: {
    start_date: Date | string;
    end_date: Date | string;
    is_half_day?: boolean;
  }[];
  onSuccess?: () => void;
}

interface FormValues {
  startDate: DateTime | null;
  endDate: DateTime | null;
  note: string;
  isHalfDay: boolean;
  halfDayPortion: string;
  halfDayDate: DateTime | null;
  halfDayDates: Record<string, HalfDayOption>;
}

export default function VacationForm({
  userId,
  province,
  holidays = [],
  existingVacations: initialVacations = [],
  onSuccess,
}: VacationFormProps) {
  // Refs for date input fields for proper popover positioning
  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [normalizedHolidays, setNormalizedHolidays] = useState<Holiday[]>([]);
  const [existingVacations, setExistingVacations] = useState<VacationBooking[]>(
    initialVacations as VacationBooking[],
  );
  const [isLoadingVacations, setIsLoadingVacations] = useState(false);

  // Fetch existing vacations from the API
  useEffect(() => {
    async function fetchVacations() {
      setIsLoadingVacations(true);
      try {
        const response = await fetch('/api/vacations');
        if (response.ok) {
          const vacationsData = await response.json();
          console.log(
            'Fetched vacations from API:',
            vacationsData.length,
            'entries',
          );
          setExistingVacations(vacationsData);
        } else {
          console.error('Failed to fetch vacations:', response.status);
          // Fall back to any vacations passed as props
          if (initialVacations.length > 0) {
            console.log(
              'Using prop-provided vacations:',
              initialVacations.length,
              'entries',
            );
            setExistingVacations(initialVacations as VacationBooking[]);
          }
        }
      } catch (error) {
        console.error('Error fetching vacations:', error);
        // Fall back to any vacations passed as props
        if (initialVacations.length > 0) {
          console.log(
            'Using prop-provided vacations after error:',
            initialVacations.length,
            'entries',
          );
          setExistingVacations(initialVacations as VacationBooking[]);
        }
      } finally {
        setIsLoadingVacations(false);
      }
    }

    void fetchVacations();
  }, [initialVacations]);

  // Get current year for holiday fetching
  const currentYear = new Date().getFullYear();

  // Use our useHolidays hook to fetch holidays from the client side
  const {
    holidays: clientHolidays,
    loading: holidaysLoading,
    error: holidaysError,
  } = useHolidays(currentYear, province);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      startDate: null,
      endDate: null,
      note: '',
      isHalfDay: false,
      halfDayPortion: 'AM',
      halfDayDate: null,
      halfDayDates: {},
    },
  });

  // Watch form fields
  const watchIsHalfDay = watch('isHalfDay');
  const watchHalfDayPortion = watch('halfDayPortion');
  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchHalfDayDate = watch('halfDayDate');
  const watchHalfDayDates = watch('halfDayDates');

  // Combine holidays from both sources to ensure we have data
  useEffect(() => {
    const combinedHolidays = [...holidays].map((holiday, index) => ({
      ...holiday,
      id: `holiday-${index}-${typeof holiday.date === 'string' ? holiday.date : DateTime.fromJSDate(holiday.date).toISODate()}`,
      // Ensure province is string | null, not string | undefined
      province: holiday.province || null,
    }));

    // Add client holidays if they're not duplicates
    if (clientHolidays && clientHolidays.length > 0) {
      clientHolidays.forEach((clientHoliday) => {
        // Check if this holiday already exists in the combined list
        const exists = combinedHolidays.some((h) => {
          const hDate =
            typeof h.date === 'string'
              ? DateTime.fromISO(h.date).toISODate()
              : DateTime.fromJSDate(h.date).toISODate();

          const clientDate =
            typeof clientHoliday.date === 'string'
              ? DateTime.fromISO(clientHoliday.date).toISODate()
              : DateTime.fromJSDate(clientHoliday.date as Date).toISODate();

          return hDate === clientDate && h.name === clientHoliday.name;
        });

        if (!exists) {
          // Add the client holiday with an id
          combinedHolidays.push({
            ...clientHoliday,
            id: `client-holiday-${clientHoliday.id || combinedHolidays.length}`,
            // Ensure province is string | null, not string | undefined
            province: clientHoliday.province || null,
          });
        }
      });
    }

    // Update the normalized holidays state
    setNormalizedHolidays(combinedHolidays as Holiday[]);
  }, [holidays, clientHolidays]);

  // Create a map of bank holiday dates for efficient lookup
  const bankHolidayMap = generateBankHolidayMap(normalizedHolidays);

  // Create shouldDisableDate function using the fetched vacations
  const shouldDisableDate = useMemo(
    () => createShouldDisableDate(bankHolidayMap, existingVacations),
    [bankHolidayMap, existingVacations],
  );

  // Convert existingVacations to VacationBooking type for MiniCalendar
  const formattedVacations: VacationBooking[] = useMemo(() => {
    // Add debug logging for existingVacations
    console.log(
      'VacationForm received existingVacations:',
      existingVacations.length,
      'entries',
    );
    if (existingVacations.length > 0) {
      console.log('First vacation:', existingVacations[0]);
    }

    return existingVacations.map((vacation, index) => {
      // Format vacation with proper date handling
      const formattedVacation = {
        id: `vacation-${index}`,
        start_date: vacation.start_date,
        end_date: vacation.end_date,
        is_half_day: vacation.is_half_day,
        created_at: new Date().toISOString(),
        userId: userId,
      };

      // Verify the date conversion for the first item
      if (index === 0) {
        console.log('Formatted vacation dates:', {
          original_start: vacation.start_date,
          original_end: vacation.end_date,
          formatted: formattedVacation,
        });
      }

      return formattedVacation;
    });
  }, [existingVacations, userId]);

  // Open calendar popover for Start Date
  const handleOpenStartDate = (event: React.MouseEvent<HTMLDivElement>) => {
    setCalendarAnchorEl(event.currentTarget);
    setActiveField('start');
  };

  // Open calendar popover for End Date
  const handleOpenEndDate = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!watchStartDate) {
      // If no start date, select that first
      handleOpenStartDate(event);
      return;
    }
    setCalendarAnchorEl(event.currentTarget);
    setActiveField('end');
  };

  // Close calendar popover
  const handleCloseCalendar = () => {
    setCalendarAnchorEl(null);
    setActiveField(null);
  };

  // Handle date selection from MiniCalendar
  const handleMiniCalendarDateSelect = (date: DateTime) => {
    if (activeField === 'start') {
      setValue('startDate', date);

      // If end date is before start date, reset it
      if (watchEndDate && watchEndDate < date) {
        setValue('endDate', null);
      }

      // If selecting start date and we don't have an end date yet,
      // switch to end date selection automatically
      if (!watchEndDate || watchEndDate < date) {
        setActiveField('end');
      } else {
        // Close calendar if both dates are set
        handleCloseCalendar();
      }
    } else if (activeField === 'end') {
      // Ensure end date is not before start date
      if (watchStartDate && date >= watchStartDate) {
        setValue('endDate', date);
        handleCloseCalendar();
      }
    }
  };

  // Initialize halfDayDates when workingDays change
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      // Get the working days
      const workingDays = getWorkingDays();

      if (workingDays.length > 0) {
        // Create default half-day settings for each working day
        const halfDaySettings: Record<string, HalfDayOption> = {};

        workingDays.forEach((day) => {
          const dateKey = day.toISODate();
          if (dateKey && !watchHalfDayDates[dateKey]) {
            halfDaySettings[dateKey] = { isHalfDay: false, portion: 'AM' };
          }
        });

        // Only update if there are new days
        if (Object.keys(halfDaySettings).length > 0) {
          setValue('halfDayDates', {
            ...watchHalfDayDates,
            ...halfDaySettings,
          });
        }
      }
    }
  }, [watchStartDate, watchEndDate, setValue, watchHalfDayDates]);

  // Generate the list of working days
  const getWorkingDays = (): DateTime[] => {
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

  // Toggle half-day for a specific date
  const toggleHalfDay = (dateKey: string) => {
    const currentSettings = watchHalfDayDates[dateKey];
    if (currentSettings) {
      const newHalfDayDates = { ...watchHalfDayDates };
      newHalfDayDates[dateKey] = {
        ...currentSettings,
        isHalfDay: !currentSettings.isHalfDay,
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
        portion,
      };
      setValue('halfDayDates', newHalfDayDates);
    }
  };

  // Calculate vacation duration (excluding weekends and holidays)
  const calculateWorkingDays = () => {
    const startDate = watchStartDate;
    const endDate = watchEndDate;
    if (!startDate || !endDate) {
      return 0;
    }

    let days = 0;

    // Create an interval between the dates
    const interval = Interval.fromDateTimes(
      startDate.startOf('day'),
      endDate.endOf('day'),
    );

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
      const halfDayCount = Object.values(watchHalfDayDates).filter(
        (day) => day.isHalfDay,
      ).length;
      if (halfDayCount > 0) {
        days -= halfDayCount * 0.5;
      } else {
        // Fallback to old behavior if no specific days are selected
        days -= 0.5;
      }
    }

    return days;
  };

  // Form submission handler
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
              portion: settings.portion,
            }))
        : [];

      await createVacationBooking({
        userId,
        startDate: startDate.toJSDate(),
        endDate: endDate.toJSDate(),
        note: data.note || null,
        isHalfDay: data.isHalfDay || false,
        halfDayPortion: data.isHalfDay ? data.halfDayPortion : null,
        halfDayDate:
          data.isHalfDay && data.halfDayDate
            ? data.halfDayDate.toJSDate()
            : null,
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
  const isSingleDay =
    watchStartDate &&
    watchEndDate &&
    watchStartDate.hasSame(watchEndDate, 'day');

  const workingDays = getWorkingDays();
  const hasMultipleWorkingDays = workingDays.length > 1;

  // Create processed holidays with consistent Date objects for VacationSummary
  const processedHolidays = useMemo(() => {
    return holidays.map((holiday) => ({
      ...holiday,
      // Convert any string dates to Date objects
      date:
        typeof holiday.date === 'string'
          ? new Date(holiday.date)
          : holiday.date,
    }));
  }, [holidays]);

  // Is calendar popover open
  const isCalendarOpen = Boolean(calendarAnchorEl);

  // Get active date for MiniCalendar
  const getActiveDate = () => {
    if (activeField === 'start') {
      return watchStartDate || DateTime.now();
    } else if (activeField === 'end') {
      return (
        watchEndDate ||
        (watchStartDate ? watchStartDate.plus({ days: 1 }) : DateTime.now())
      );
    }
    return DateTime.now();
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
    >
      <div className="space-y-4">
        {/* Holiday information display */}
        <HolidayDisplay
          holidays={normalizedHolidays}
          loading={holidaysLoading}
          error={holidaysError}
        />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Controller
              name="startDate"
              control={control}
              rules={{ required: 'Start date is required' }}
              render={({ field, fieldState }) => (
                <TextField
                  label="Start Date"
                  fullWidth
                  inputRef={startDateRef}
                  onClick={handleOpenStartDate}
                  value={field.value ? field.value.toFormat('MMM d, yyyy') : ''}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={(e) => handleOpenStartDate(e as any)}
                        >
                          <CalendarTodayIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiInputBase-root': {
                      cursor: 'pointer',
                    },
                  }}
                />
              )}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Controller
              name="endDate"
              control={control}
              rules={{ required: 'End date is required' }}
              render={({ field, fieldState }) => (
                <TextField
                  label="End Date"
                  fullWidth
                  inputRef={endDateRef}
                  onClick={handleOpenEndDate}
                  value={field.value ? field.value.toFormat('MMM d, yyyy') : ''}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={(e) => handleOpenEndDate(e as any)}
                        >
                          <CalendarTodayIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{
                    cursor: 'pointer',
                    '& .MuiInputBase-root': {
                      cursor: 'pointer',
                    },
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        {/* MiniCalendar Popover */}
        <Popover
          open={isCalendarOpen}
          anchorEl={calendarAnchorEl}
          onClose={handleCloseCalendar}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          sx={{
            mt: 1,
            '& .MuiPopover-paper': {
              boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.2)',
              borderRadius: 1,
            },
          }}
        >
          <Box sx={{ p: 1, width: 280 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {activeField === 'start'
                ? 'Select Start Date'
                : 'Select End Date'}
            </Typography>

            {isLoadingVacations ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <MiniCalendar
                holidays={normalizedHolidays}
                vacations={existingVacations}
                province={province}
                onDateSelect={handleMiniCalendarDateSelect}
                selectedDate={getActiveDate()}
              />
            )}

            <Box
              sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: CALENDAR_COLORS.VACATION.FULL_DAY,
                    border: `1px solid ${CALENDAR_COLORS.VACATION.TEXT}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Already booked vacation (not selectable)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: CALENDAR_COLORS.HOLIDAY.BANK,
                    border: `1px solid ${CALENDAR_COLORS.HOLIDAY.TEXT}`,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Holiday
                </Typography>
              </Box>
            </Box>
          </Box>
        </Popover>

        {/* Half-day vacation settings */}
        <HalfDaySettings
          startDate={watchStartDate}
          endDate={watchEndDate}
          halfDayData={{
            isHalfDay: watchIsHalfDay,
            halfDayPortion: watchHalfDayPortion,
            halfDayDate: watchHalfDayDate,
            halfDayDates: watchHalfDayDates,
          }}
          onToggleHalfDay={(enabled) => setValue('isHalfDay', enabled)}
          onHalfDayPortionChange={(portion) =>
            setValue('halfDayPortion', portion)
          }
          onToggleDateHalfDay={toggleHalfDay}
          onDatePortionChange={setHalfDayPortion}
          shouldDisableDate={shouldDisableDate}
        />

        {isSingleDay && !watchIsHalfDay && (
          <FormHelperText>
            For a single day, consider selecting the &quot;Enable half-day
            vacation(s)&quot; option if you&apos;re only taking half a day off.
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
        {watchStartDate && watchEndDate && (
          <VacationSummary
            startDate={watchStartDate.toJSDate()}
            endDate={watchEndDate.toJSDate()}
            workingDays={calculateWorkingDays()}
            isHalfDay={watchIsHalfDay}
            halfDayPortion={watchHalfDayPortion}
            halfDayDate={
              watchHalfDayDate ? watchHalfDayDate.toJSDate() : undefined
            }
            halfDayDates={Object.entries(watchHalfDayDates)
              .filter(([_, settings]) => settings.isHalfDay)
              .map(([dateStr, settings]) => ({
                date: DateTime.fromISO(dateStr).toJSDate(),
                portion: settings.portion,
              }))}
            holidays={processedHolidays}
          />
        )}

        {/* Error and success messages */}
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
