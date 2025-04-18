/**
 * VacationEditDialog Component
 *
 * This component provides a dialog for editing existing vacation bookings.
 * It allows users to modify the start date, end date, and note for a vacation.
 */
'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react'; // Add useMemo
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Grid,
  Typography,
  InputAdornment,
  IconButton,
  Popover,
  CircularProgress,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { DateTime } from 'luxon';
import MiniCalendar from '@/components/dashboard/MiniCalendar';
import HalfDaySettings, { HalfDayOption } from './HalfDaySettings';
import { CALENDAR_COLORS } from '@/lib/constants/colors';
import useHolidays from '@/lib/hooks/useHolidays';
import { Holiday, VacationBooking } from '@/types'; // Import VacationBooking

interface VacationEditDialogProps {
  open: boolean;
  onClose: () => void;
  vacation: {
    id: string;
    start_date: string;
    end_date: string;
    note?: string;
    is_half_day?: boolean;
    half_day_portion?: string;
    user_id: string;
    google_event_id?: string;
  } | null;
  onSuccess: () => void;
}

interface FormValues {
  startDate: DateTime | null;
  endDate: DateTime | null;
  note: string;
  isHalfDay: boolean;
  halfDayPortion: string;
}

export default function VacationEditDialog({
  open,
  onClose,
  vacation,
  onSuccess,
}: VacationEditDialogProps) {
  const startDateRef = useRef<HTMLDivElement>(null);
  const endDateRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [allVacations, setAllVacations] = useState<VacationBooking[]>([]); // State for all vacations
  const [isLoadingVacations, setIsLoadingVacations] = useState(true); // Loading state for vacations

  // Get current year for holiday fetching
  const currentYear = new Date().getFullYear();
  const province = 'ON'; // Default province - could be fetched from user settings

  // Fetch holidays using the hook
  const { holidays: fetchedHolidays, loading: holidaysLoading } = useHolidays(
    currentYear,
    province,
  );

  // Update holidays when they're fetched
  useEffect(() => {
    if (fetchedHolidays?.length) {
      setHolidays(fetchedHolidays);
    }
  }, [fetchedHolidays]);

  // Fetch all existing vacations
  useEffect(() => {
    async function fetchVacations() {
      setIsLoadingVacations(true);
      try {
        const response = await fetch('/api/vacations');
        const rawData: unknown = await response.json();

        if (!response.ok) {
          console.error('Failed to fetch vacations:', response.status);
          setError('Could not load existing vacation data.');
          return;
        }

        if (!Array.isArray(rawData)) {
          throw new Error('Invalid vacations data format');
        }

        const vacationsData: VacationBooking[] = rawData.map((v: any) => {
          if (
            typeof v.id !== 'string' ||
            typeof v.user_id !== 'string' ||
            typeof v.start_date !== 'string' ||
            typeof v.end_date !== 'string'
          ) {
            throw new Error('Invalid vacation record structure');
          }

          return v as VacationBooking;
        });

        setAllVacations(vacationsData);
      } catch (error) {
        console.error('Error fetching vacations:', error);
        setError(
          error instanceof Error ? error.message : 'Failed to load vacations',
        );
      } finally {
        setIsLoadingVacations(false);
      }
    }

    if (open) {
      // Only fetch when the dialog is open
      void fetchVacations();
    }
  }, [open]); // Re-fetch if the dialog re-opens

  // Form setup with vacation data as default values
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
      startDate: vacation ? DateTime.fromISO(vacation.start_date) : null,
      endDate: vacation ? DateTime.fromISO(vacation.end_date) : null,
      note: vacation?.note || '',
      isHalfDay: vacation?.is_half_day || false,
      halfDayPortion: vacation?.half_day_portion || 'AM',
    },
  });

  // Update form when vacation changes
  useEffect(() => {
    if (vacation) {
      reset({
        startDate: DateTime.fromISO(vacation.start_date),
        endDate: DateTime.fromISO(vacation.end_date),
        note: vacation.note || '',
        isHalfDay: vacation.is_half_day || false,
        halfDayPortion: vacation.half_day_portion || 'AM',
      });
    }
  }, [vacation, reset]);

  // Watch form fields
  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchIsHalfDay = watch('isHalfDay');
  const watchHalfDayPortion = watch('halfDayPortion');

  // Calendar popover handlers
  const handleOpenStartDate = (event: React.MouseEvent<HTMLDivElement>) => {
    setCalendarAnchorEl(event.currentTarget);
    setActiveField('start');
  };

  const handleOpenEndDate = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!watchStartDate) {
      // If no start date, select that first
      handleOpenStartDate(event);
      return;
    }
    setCalendarAnchorEl(event.currentTarget);
    setActiveField('end');
  };

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

      if (!watchEndDate) {
        setActiveField('end');
      } else {
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

  // Form submission handler for updating vacation
  const onSubmit = async (data: FormValues) => {
    if (!vacation?.id || !data.startDate || !data.endDate) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/vacations/${vacation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          start_date: data.startDate.toISODate(),
          end_date: data.endDate.toISODate(),
          note: data.note || null,
          is_half_day: data.isHalfDay || false,
          half_day_portion: data.isHalfDay ? data.halfDayPortion : null,
        }),
      });

      const rawData: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof rawData === 'object' &&
          rawData !== null &&
          typeof (rawData as any).error === 'string'
            ? (rawData as any).error
            : 'Failed to update vacation';

        throw new Error(errorMessage);
      }

      // Optionally validate successful response structure here if needed
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating vacation:', error);
      setError(
        error instanceof Error ? error.message : 'An unknown error occurred',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

  // Filter out the current vacation being edited from the list of all vacations
  const otherVacations = useMemo(() => {
    if (!vacation) return allVacations;
    return allVacations.filter((v) => v.id !== vacation.id);
  }, [allVacations, vacation]);
  // Removed extra brace and semicolon from here

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Vacation</DialogTitle>
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
      >
        <DialogContent>
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
                    value={
                      field.value ? field.value.toFormat('MMM d, yyyy') : ''
                    }
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
                    value={
                      field.value ? field.value.toFormat('MMM d, yyyy') : ''
                    }
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

            <Grid item xs={12}>
              <TextField
                label="Note (Optional)"
                fullWidth
                multiline
                rows={2}
                placeholder="Add any details about your vacation..."
                {...register('note')}
                sx={{ mt: 2 }}
              />
            </Grid>

            <Grid item xs={12}>
              <HalfDaySettings
                startDate={watchStartDate}
                endDate={watchEndDate}
                halfDayData={{
                  isHalfDay: watchIsHalfDay,
                  halfDayPortion: watchHalfDayPortion,
                  halfDayDate: watchIsHalfDay ? watchStartDate : null,
                  halfDayDates: {},
                }}
                onToggleHalfDay={(enabled) => setValue('isHalfDay', enabled)}
                onHalfDayPortionChange={(portion) =>
                  setValue('halfDayPortion', portion)
                }
                onToggleDateHalfDay={(dateKey) => {
                  // Empty handler, simplified edit mode doesn't use this
                }}
                onDatePortionChange={(dateKey, portion) => {
                  // Empty handler, simplified edit mode doesn't use this
                }}
                simplified={true} // Use simplified mode for edit dialog
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

              {holidaysLoading || isLoadingVacations ? ( // Check both loading states
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <MiniCalendar
                  holidays={holidays}
                  vacations={otherVacations} // Pass the filtered list of other vacations
                  province={province}
                  onDateSelect={handleMiniCalendarDateSelect}
                  selectedDate={getActiveDate()}
                  // vacationToExclude prop is not needed if we pass the filtered list
                />
              )}

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

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || !watchStartDate || !watchEndDate}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
