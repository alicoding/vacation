import { useState, useRef, useEffect, useCallback } from 'react'; // Add useCallback
import { useForm, UseFormReturn, Control } from 'react-hook-form';
import { DateTime } from 'luxon';
import { HalfDayOption } from '../HalfDaySettings'; // Assuming HalfDaySettings exports this

export interface VacationFormValues {
  startDate: DateTime | null;
  endDate: DateTime | null;
  note: string;
  isHalfDay: boolean; // This might become redundant if using halfDayDates exclusively
  halfDayPortion: string; // This might become redundant
  halfDayDate: DateTime | null; // This might become redundant
  halfDayDates: Record<string, HalfDayOption>; // Keyed by ISO date string
}

interface UseVacationFormStateProps {
  // Potentially pass initial values if needed for editing later
  // initialValues?: Partial<VacationFormValues>;
  shouldDisableDate: (date: DateTime) => boolean; // Needed for half-day logic
}

interface UseVacationFormStateReturn {
  formMethods: UseFormReturn<VacationFormValues>;
  control: Control<VacationFormValues>; // Export control for Controller components
  watchStartDate: DateTime | null;
  watchEndDate: DateTime | null;
  watchIsHalfDay: boolean;
  watchHalfDayPortion: string;
  watchHalfDayDate: DateTime | null;
  watchHalfDayDates: Record<string, HalfDayOption>;
  calendarAnchorEl: HTMLElement | null;
  activeField: 'start' | 'end' | null;
  startDateRef: React.RefObject<HTMLDivElement | null>; // Allow null
  endDateRef: React.RefObject<HTMLDivElement | null>; // Allow null
  handleOpenStartDate: (event: React.MouseEvent<HTMLElement>) => void;
  handleOpenEndDate: (event: React.MouseEvent<HTMLElement>) => void;
  handleCloseCalendar: () => void;
  handleMiniCalendarDateSelect: (date: DateTime) => void;
  getWorkingDays: () => DateTime[];
  toggleHalfDayForDate: (dateKey: string) => void;
  setHalfDayPortionForDate: (dateKey: string, portion: string) => void;
  getActiveDateForCalendar: () => DateTime;
}

export function useVacationFormState({
  shouldDisableDate,
}: UseVacationFormStateProps): UseVacationFormStateReturn {
  const startDateRef = useRef<HTMLDivElement>(null); // Ref for DOM element
  const endDateRef = useRef<HTMLDivElement>(null); // Ref for DOM element
  const prevStartDateISO = useRef<string | null>(null); // Ref for previous start date value (ISO string)
  const prevEndDateISO = useRef<string | null>(null); // Ref for previous end date value (ISO string)

  const [calendarAnchorEl, setCalendarAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);

  console.log('[useVacationFormState] Hook execution start/re-render'); // Log hook execution
  // Form setup
  const formMethods = useForm<VacationFormValues>({
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

  const { control, watch, setValue, reset } = formMethods;

  // Watch form fields
  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchIsHalfDay = watch('isHalfDay');
  const watchHalfDayPortion = watch('halfDayPortion');
  const watchHalfDayDate = watch('halfDayDate');
  const watchHalfDayDates = watch('halfDayDates');

  // Calendar popover handlers
  const handleOpenStartDate = (event: React.MouseEvent<HTMLElement>) => {
    setCalendarAnchorEl(event.currentTarget);
    setActiveField('start');
  };

  const handleOpenEndDate = (event: React.MouseEvent<HTMLElement>) => {
    if (!watchStartDate) {
      handleOpenStartDate(event); // Force start date selection first
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
  const handleMiniCalendarDateSelect = useCallback(
    (date: DateTime) => {
      // Ensure useCallback is used if dependencies exist
      console.log(
        `[useVacationFormState] handleMiniCalendarDateSelect START: Field=${activeField}, Date=${date?.toISO() ?? 'null'}`,
      ); // Log date selection start
      console.log(
        `[useVacationFormState] handleMiniCalendarDateSelect START: Field=${activeField}, Date=${date.toISO()}`,
      ); // Log date selection start
      if (activeField === 'start') {
        console.log(
          `[useVacationFormState] BEFORE setValue(startDate): ${date?.toISO() ?? 'null'}`,
        );
        setValue('startDate', date, { shouldDirty: true, shouldTouch: true });
        // If end date is before start date, reset it
        if (watchEndDate && watchEndDate < date) {
          console.log(
            `[useVacationFormState] BEFORE setValue(endDate) to null (resetting)`,
          );
          setValue('endDate', null, { shouldDirty: true, shouldTouch: true });
        }
        // If selecting start date and we don't have an end date yet,
        // switch to end date selection automatically
        if (!watchEndDate || watchEndDate < date) {
          console.log(`[useVacationFormState] Switching activeField to 'end'`);
          setActiveField('end');
        } else {
          console.log(
            `[useVacationFormState] Closing calendar after start date selection (end date exists)`,
          );
          // Delay closing slightly to allow state to settle before effects run
          setTimeout(() => handleCloseCalendar(), 50);
        }
      } else if (activeField === 'end') {
        // Ensure end date is not before start date
        if (watchStartDate && date >= watchStartDate) {
          console.log(
            `[useVacationFormState] BEFORE setValue(endDate): ${date?.toISO() ?? 'null'}`,
          );
          setValue('endDate', date, { shouldDirty: true, shouldTouch: true });
          console.log(
            `[useVacationFormState] Closing calendar after end date selection`,
          );
          // Delay closing slightly to allow state to settle before effects run
          setTimeout(() => handleCloseCalendar(), 50);
        }
      }
      console.log(`[useVacationFormState] handleMiniCalendarDateSelect END`);
    },
    [activeField, watchEndDate, watchStartDate, setValue, handleCloseCalendar],
  ); // Added dependencies for useCallback

  // Generate the list of working days within the selected range
  // Generate the list of working days within the selected range
  const getWorkingDays = useCallback((): DateTime[] => {
    // Wrap in useCallback
    if (!watchStartDate || !watchEndDate) {
      return [];
    }
    const workingDays: DateTime[] = [];
    let currentDate = watchStartDate.startOf('day');
    while (currentDate <= watchEndDate) {
      if (!shouldDisableDate(currentDate)) {
        // Use the passed function
        workingDays.push(currentDate);
      }
      currentDate = currentDate.plus({ days: 1 });
    }
    return workingDays;
  }, [watchStartDate, watchEndDate, shouldDisableDate]); // Add dependencies

  // Initialize/Update halfDayDates when workingDays change
  // Initialize/Update halfDayDates when workingDays change
  useEffect(() => {
    const currentStartDateISO = watchStartDate?.toISO() ?? null;
    const currentEndDateISO = watchEndDate?.toISO() ?? null;

    // Check if the actual date *values* (as ISO strings) have changed since the last run
    if (
      currentStartDateISO === prevStartDateISO.current &&
      currentEndDateISO === prevEndDateISO.current
    ) {
      console.log(
        '[useVacationFormState] halfDayDates useEffect: Skipping update, date values unchanged.',
      );
      return; // Dates haven't changed value, no need to recalculate/set state
    }

    console.log(
      `[useVacationFormState] halfDayDates useEffect RUNNING. Start=${currentStartDateISO}, End=${currentEndDateISO}`,
    );
    // Update refs for the next run *before* any potential state updates below
    prevStartDateISO.current = currentStartDateISO;
    prevEndDateISO.current = currentEndDateISO;

    // Get current value directly to avoid dependency loop
    const currentHalfDayDates = formMethods.getValues('halfDayDates') || {};

    if (watchStartDate && watchEndDate) {
      const workingDays = getWorkingDays(); // Call the memoized function
      const newHalfDaySettings: Record<string, HalfDayOption> = {};
      let needsAddition = false;
      const workingDayKeys = new Set(
        workingDays
          .map((day) => day.toISODate())
          .filter((d): d is string => !!d),
      ); // Set of valid date keys

      // Add missing days
      workingDays.forEach((day) => {
        const dateKey = day.toISODate();
        if (dateKey && !(dateKey in currentHalfDayDates)) {
          newHalfDaySettings[dateKey] = { isHalfDay: false, portion: 'AM' };
          needsAddition = true;
        }
      });

      // Check for days to remove
      const keysToRemove = Object.keys(currentHalfDayDates).filter(
        (dateKey) => !workingDayKeys.has(dateKey),
      );
      const needsRemoval = keysToRemove.length > 0;

      if (needsAddition || needsRemoval) {
        // Create the final state based on current + new - removed
        const finalHalfDayDates = { ...currentHalfDayDates };
        keysToRemove.forEach((key) => delete finalHalfDayDates[key]); // Remove old keys
        Object.assign(finalHalfDayDates, newHalfDaySettings); // Add new keys

        // Perform a robust comparison before setting state
        const currentKeys = Object.keys(currentHalfDayDates);
        const finalKeys = Object.keys(finalHalfDayDates);
        let areDifferent = currentKeys.length !== finalKeys.length;

        if (!areDifferent) {
          // If lengths are the same, check if keys or values differ
          for (const key of finalKeys) {
            if (
              !currentHalfDayDates[key] ||
              currentHalfDayDates[key].isHalfDay !==
                finalHalfDayDates[key].isHalfDay ||
              currentHalfDayDates[key].portion !==
                finalHalfDayDates[key].portion
            ) {
              areDifferent = true;
              break;
            }
          }
        }

        if (areDifferent) {
          console.log(
            '[useVacationFormState] halfDayDates useEffect: BEFORE setValue(halfDayDates) (difference detected).',
            finalHalfDayDates,
          );
          setValue('halfDayDates', finalHalfDayDates, {
            shouldDirty: true,
            shouldTouch: true,
          });
        } else {
          console.log(
            '[useVacationFormState] halfDayDates useEffect: halfDayDates state is already up-to-date (no difference detected).',
          );
        }
      } else {
        console.log(
          '[useVacationFormState] halfDayDates useEffect: No additions or removals needed.',
        );
      }
    } else {
      // Reset if no valid date range and state is not already empty
      if (Object.keys(currentHalfDayDates).length > 0) {
        console.log(
          '[useVacationFormState] halfDayDates useEffect: BEFORE setValue(halfDayDates) to {} (resetting).',
        );
        setValue('halfDayDates', {}, { shouldDirty: true, shouldTouch: true });
      } else {
        console.log(
          '[useVacationFormState] halfDayDates useEffect: No date range, and halfDayDates already empty.',
        );
      }
    }
    // Dependencies include watched dates and functions used inside the effect.
    // The ref check at the top prevents loops caused by reference changes.
    // Dependencies strictly limited to the dates that trigger the calculation.
    // The ref check prevents loops if only references change.
  }, [watchStartDate, watchEndDate]);

  // Toggle half-day for a specific date
  const toggleHalfDayForDate = (dateKey: string) => {
    const currentSettings = watchHalfDayDates[dateKey];
    if (currentSettings) {
      const newHalfDayDates = { ...watchHalfDayDates };
      newHalfDayDates[dateKey] = {
        ...currentSettings,
        isHalfDay: !currentSettings.isHalfDay,
      };
      setValue('halfDayDates', newHalfDayDates);
      // Also update the global isHalfDay flag if any date is toggled
      setValue(
        'isHalfDay',
        Object.values(newHalfDayDates).some((d) => d.isHalfDay),
      );
    }
  };

  // Set half-day portion for a specific date
  const setHalfDayPortionForDate = (dateKey: string, portion: string) => {
    const currentSettings = watchHalfDayDates[dateKey];
    if (currentSettings && currentSettings.isHalfDay) {
      // Only change portion if it's a half day
      const newHalfDayDates = { ...watchHalfDayDates };
      newHalfDayDates[dateKey] = {
        ...currentSettings,
        portion,
      };
      setValue('halfDayDates', newHalfDayDates);
    }
  };

  // Get active date for MiniCalendar based on the field being edited
  const getActiveDateForCalendar = () => {
    if (activeField === 'start') {
      return watchStartDate || DateTime.now();
    } else if (activeField === 'end') {
      // Default to day after start date if end date not set
      return (
        watchEndDate ||
        (watchStartDate ? watchStartDate.plus({ days: 1 }) : DateTime.now())
      );
    }
    // Default to today if no field active (shouldn't happen if opened correctly)
    return DateTime.now();
  };

  return {
    formMethods,
    control,
    watchStartDate,
    watchEndDate,
    watchIsHalfDay,
    watchHalfDayPortion,
    watchHalfDayDate,
    watchHalfDayDates,
    calendarAnchorEl,
    activeField,
    startDateRef,
    endDateRef,
    handleOpenStartDate,
    handleOpenEndDate,
    handleCloseCalendar,
    handleMiniCalendarDateSelect,
    getWorkingDays,
    toggleHalfDayForDate,
    setHalfDayPortionForDate,
    getActiveDateForCalendar,
  };
}
