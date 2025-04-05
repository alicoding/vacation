/**
 * VacationForm Component for booking vacations.
 * Refactored to use custom hooks for state management and data fetching.
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Controller } from 'react-hook-form';
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
import { DateTime } from 'luxon';
import { useRouter } from 'next/navigation';
import useHolidays from '@/lib/hooks/useHolidays'; // Keep client-side holiday fetching
import { createVacationBooking } from '@/lib/client/vacationClient';
import VacationSummary from './VacationSummary';
import HalfDaySettings from './HalfDaySettings';
import HolidayDisplay from './HolidayDisplay'; // Keep if needed for display
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MiniCalendar from '@/components/dashboard/MiniCalendar';
import {
  generateBankHolidayMap,
  // createShouldDisableDate, // Moved to useExistingVacations hook
} from './VacationDateUtils';
import { CALENDAR_COLORS } from '@/lib/constants/colors';
import { Holiday, VacationBooking } from '@/types';
import { useExistingVacations } from './hooks/useExistingVacations'; // Import new hook
import { useVacationFormState } from './hooks/useVacationFormState'; // Import new hook

interface VacationFormProps {
  userId: string;
  province: string;
  // Prop holidays are still needed for initial SSR/server data
  holidays: {
    date: Date | string;
    name: string;
    province: string | null;
    type: 'bank' | 'provincial';
  }[];
  // Prop existingVacations are still needed for initial SSR/server data
  existingVacations?: {
    start_date: Date | string;
    end_date: Date | string;
    is_half_day?: boolean;
  }[];
  onSuccess?: () => void;
}

export default function VacationForm({
  userId,
  province,
  holidays: propHolidays = [],
  existingVacations: initialVacations = [],
  onSuccess,
}: VacationFormProps) {
  console.log('[VacationForm] Rendering/Re-rendering'); // Log form render
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- Holiday Management ---
  const currentYear = new Date().getFullYear();
  const {
    holidays: clientHolidays,
    loading: holidaysLoading,
    error: holidaysFetchError, // Renamed to avoid clash
  } = useHolidays(currentYear, province);

  const [normalizedHolidays, setNormalizedHolidays] = useState<Holiday[]>([]);

  // Combine and normalize holidays from props and client fetch
  useEffect(() => {
    const normalizedPropHolidays: Holiday[] = propHolidays.map(
      (propHoliday, index): Holiday => {
        const holidayDate =
          typeof propHoliday.date === 'string'
            ? DateTime.fromISO(propHoliday.date)
            : DateTime.fromJSDate(propHoliday.date);
        const holidayDateStr = holidayDate.isValid
          ? holidayDate.toISODate()
          : null;
        if (!holidayDateStr)
          console.warn(
            `[VacationForm] Could not parse date for prop holiday:`,
            propHoliday,
          );
        return {
          name: propHoliday.name,
          id: `prop-holiday-${index}-${holidayDateStr || 'invalid-date'}`,
          date: holidayDateStr || '',
          type: [propHoliday.type],
          province: propHoliday.province || undefined,
          description: undefined,
        };
      },
    );

    const combinedHolidays: Holiday[] = [...normalizedPropHolidays];

    if (clientHolidays && clientHolidays.length > 0) {
      clientHolidays.forEach((clientHoliday) => {
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
          const clientDate = DateTime.fromISO(clientHoliday.date);
          const clientDateStr = clientDate.isValid
            ? clientDate.toISODate()
            : null;
          if (!clientDateStr)
            console.warn(
              `[VacationForm] Could not parse date for client holiday:`,
              clientHoliday,
            );
          combinedHolidays.push({
            id:
              clientHoliday.id ||
              `client-holiday-${combinedHolidays.length}-${clientDateStr || 'invalid-date'}`,
            date: clientDateStr || '',
            name: clientHoliday.name,
            description: clientHoliday.description || undefined,
            type: Array.isArray(clientHoliday.type) ? clientHoliday.type : [],
            province: clientHoliday.province || undefined,
          });
        }
      });
    }
    setNormalizedHolidays(combinedHolidays);
  }, [propHolidays, clientHolidays]);

  // Create bank holiday map (needed by useExistingVacations)
  const bankHolidayMap = useMemo(
    () => generateBankHolidayMap(normalizedHolidays),
    [normalizedHolidays],
  );

  // --- Existing Vacations Hook ---
  const {
    // existingVacations, // Raw data if needed elsewhere
    formattedVacations, // Formatted for MiniCalendar
    shouldDisableDate,
    isLoadingVacations,
    vacationsError,
  } = useExistingVacations({
    initialVacations: initialVacations,
    userId,
    bankHolidayMap, // Pass the map here
  });

  // --- Form State Hook ---
  const {
    formMethods,
    control,
    watchStartDate,
    watchEndDate,
    watchIsHalfDay, // Keep watching this for the summary/logic
    watchHalfDayPortion, // Keep watching this
    watchHalfDayDates,
    calendarAnchorEl,
    activeField,
    startDateRef,
    endDateRef,
    handleOpenStartDate,
    handleOpenEndDate,
    handleCloseCalendar,
    handleMiniCalendarDateSelect,
    // getWorkingDays, // Not directly needed in component if logic is in hook/summary
    toggleHalfDayForDate,
    setHalfDayPortionForDate,
    getActiveDateForCalendar,
  } = useVacationFormState({ shouldDisableDate }); // Pass shouldDisableDate

  const { handleSubmit, setValue } = formMethods; // Get handleSubmit from formMethods

  // --- Form Submission ---
  // Use the correct form values type from the hook
  const onSubmit = async (
    data: import('./hooks/useVacationFormState').VacationFormValues,
  ) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const { startDate, endDate, note } = data; // Get data from hook's state via watch or form data

    if (!startDate || !endDate) {
      setSubmitError('Please select both start and end dates.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare half-day dates for submission
      const halfDayInfo = data.isHalfDay
        ? Object.entries(
            data.halfDayDates as Record<
              string,
              { isHalfDay: boolean; portion: string }
            >,
          )
            .filter(([_, settings]) => settings.isHalfDay)
            .map(([dateStr, settings]) => ({
              date: DateTime.fromISO(dateStr).toJSDate(), // Convert back to JS Date for API
              portion: settings.portion,
            }))
        : []; // Empty array if not a half-day booking overall

      // Construct bookingData according to VacationBookingInput type
      const bookingData: import('@/services/vacation/vacationTypes').VacationBookingInput =
        {
          userId,
          startDate: startDate.toJSDate(), // Use JS Date object
          endDate: endDate.toJSDate(), // Use JS Date object
          note: data.note || null,
          isHalfDay: data.isHalfDay,
          // Pass the detailed half-day info if available
          halfDayDates: halfDayInfo.length > 0 ? halfDayInfo : undefined,
          // halfDayPortion and halfDayDate are likely not needed if halfDayDates is used
        };

      console.log(
        'Submitting vacation booking (VacationBookingInput):',
        bookingData,
      );

      const result = await createVacationBooking(bookingData);

      console.log('Vacation booking successful:', result);
      setSubmitSuccess(true);
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to dashboard or vacation list page after success
        router.push('/dashboard/vacations');
      }
      // Optionally reset form: reset();
    } catch (error: any) {
      console.error('Error booking vacation:', error);
      setSubmitError(
        error.message || 'An unexpected error occurred while booking.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the selected range is a single day
  const isSingleDay = useMemo(() => {
    return (
      watchStartDate &&
      watchEndDate &&
      watchStartDate.hasSame(watchEndDate, 'day')
    );
  }, [watchStartDate, watchEndDate]);

  // Convert normalized holidays for VacationSummary (expects Date objects)
  const summaryHolidays = useMemo(() => {
    return normalizedHolidays
      .map((holiday) => {
        const date = DateTime.fromISO(holiday.date);
        return date.isValid ? { ...holiday, date: date.toJSDate() } : null;
      })
      .filter((h): h is Holiday & { date: Date } => h !== null);
  }, [normalizedHolidays]);

  // Memoize props for VacationSummary to prevent unnecessary re-renders/effects
  const summaryStartDate = useMemo(
    () => watchStartDate?.toJSDate() ?? null,
    [watchStartDate],
  );
  const summaryEndDate = useMemo(
    () => watchEndDate?.toJSDate() ?? null,
    [watchEndDate],
  );
  const summaryHalfDayDates = useMemo(() => {
    return Object.entries(watchHalfDayDates)
      .filter(([_, settings]) => settings.isHalfDay)
      .map(([dateStr, settings]) => ({
        date: DateTime.fromISO(dateStr).toJSDate(),
        portion: settings.portion,
      }));
  }, [watchHalfDayDates]);

  // --- Render ---
  // --- Render ---
  return (
    <LocalizationProvider dateAdapter={AdapterLuxon}>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e); // Use handleSubmit from hook
        }}
      >
        <div className="space-y-4">
          {/* Display loading/error states */}
          {holidaysLoading && (
            <Alert severity="info">Loading holidays...</Alert>
          )}
          {holidaysFetchError && (
            <Alert severity="error">
              Error loading holidays: {holidaysFetchError}
            </Alert>
          )}
          {isLoadingVacations && (
            <Alert severity="info">Loading existing vacations...</Alert>
          )}
          {vacationsError && (
            <Alert severity="error">
              Error loading existing vacations: {vacationsError}
            </Alert>
          )}

          {/* Date Inputs */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Controller
                name="startDate"
                control={control} // Use control from hook
                rules={{ required: 'Start date is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    label="Start Date"
                    fullWidth
                    inputRef={startDateRef} // Use ref from hook
                    onClick={(e) => handleOpenStartDate(e as any)} // Use handler from hook
                    value={
                      field.value ? field.value.toFormat('MMM d, yyyy') : ''
                    }
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={(e) => handleOpenStartDate(e as any)} // Use handler from hook
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
                      '& .MuiInputBase-root': { cursor: 'pointer' },
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Controller
                name="endDate"
                control={control} // Use control from hook
                rules={{ required: 'End date is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    label="End Date"
                    fullWidth
                    inputRef={endDateRef} // Use ref from hook
                    onClick={(e) => handleOpenEndDate(e as any)} // Use handler from hook
                    value={
                      field.value ? field.value.toFormat('MMM d, yyyy') : ''
                    }
                    InputProps={{
                      readOnly: true,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={(e) => handleOpenEndDate(e as any)} // Use handler from hook
                            disabled={!watchStartDate} // Disable if no start date
                          >
                            <CalendarTodayIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={!watchStartDate} // Disable field if no start date
                    sx={{
                      cursor: 'pointer',
                      '& .MuiInputBase-root': { cursor: 'pointer' },
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>

          {/* MiniCalendar Popover */}
          <Popover
            open={Boolean(calendarAnchorEl)} // Use state from hook
            anchorEl={calendarAnchorEl} // Use state from hook
            onClose={handleCloseCalendar} // Use handler from hook
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
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
              {isLoadingVacations || holidaysLoading ? ( // Check both loading states
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <MiniCalendar
                  holidays={normalizedHolidays} // Pass normalized holidays
                  vacations={formattedVacations} // Pass formatted vacations from hook
                  province={province}
                  onDateSelect={handleMiniCalendarDateSelect} // Use handler from hook
                  selectedDate={getActiveDateForCalendar()} // Use getter from hook
                  // No need for vacationToExclude if formattedVacations is correct
                />
              )}
              {/* Legend */}
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
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
                    Already booked
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

          {/* Half Day Settings */}
          <HalfDaySettings
            startDate={watchStartDate}
            endDate={watchEndDate}
            halfDayData={{
              // Pass data from hook state
              isHalfDay: watchIsHalfDay,
              halfDayPortion: watchHalfDayPortion,
              halfDayDate: null, // Deprecated?
              halfDayDates: watchHalfDayDates,
            }}
            onToggleHalfDay={(enabled) => setValue('isHalfDay', enabled)} // Use setValue from hook
            onHalfDayPortionChange={(portion) =>
              setValue('halfDayPortion', portion)
            } // Use setValue from hook (maybe remove if only using date-specific)
            onToggleDateHalfDay={toggleHalfDayForDate} // Use handler from hook
            onDatePortionChange={setHalfDayPortionForDate} // Use handler from hook
            simplified={false} // Use detailed mode
          />

          {/* Note Field */}
          <TextField
            label="Note (Optional)"
            fullWidth
            multiline
            rows={3}
            placeholder="Add any details about your vacation..."
            {...formMethods.register('note')} // Use register from hook's formMethods
          />

          {/* Vacation Summary */}
          {watchStartDate && watchEndDate && (
            <VacationSummary
              startDate={summaryStartDate} // Use memoized value
              endDate={summaryEndDate} // Use memoized value
              province={province}
              // isHalfDay={watchIsHalfDay} // Not directly needed
              halfDayDates={summaryHalfDayDates} // Use memoized value
              // holidays prop removed, summary fetches its own
            />
          )}

          {/* Submission Feedback */}
          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
          {submitSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Vacation booked successfully!
            </Alert>
          )}

          {/* Action Buttons */}
          <Box sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !watchStartDate || !watchEndDate}
              fullWidth
            >
              {isSubmitting ? 'Booking...' : 'Book Vacation'}
            </Button>
          </Box>
        </div>
      </form>
    </LocalizationProvider>
  );
}
