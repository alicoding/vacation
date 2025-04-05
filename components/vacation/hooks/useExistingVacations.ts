import { useState, useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { VacationBooking, Holiday } from '@/types';
import { createShouldDisableDate } from '../VacationDateUtils'; // Assuming VacationDateUtils is in the parent dir

interface UseExistingVacationsProps {
  initialVacations?: Partial<VacationBooking>[]; // Allow partial for initial props
  userId: string;
  bankHolidayMap: Map<string, string>; // Pass the holiday map needed for shouldDisableDate (Date string -> Holiday Name)
}

interface UseExistingVacationsReturn {
  existingVacations: VacationBooking[];
  formattedVacations: VacationBooking[]; // For MiniCalendar potentially
  shouldDisableDate: (date: DateTime) => boolean;
  isLoadingVacations: boolean;
  vacationsError: string | null;
}

export function useExistingVacations({
  initialVacations = [],
  userId,
  bankHolidayMap,
}: UseExistingVacationsProps): UseExistingVacationsReturn {
  const [existingVacations, setExistingVacations] = useState<VacationBooking[]>(
    initialVacations as VacationBooking[], // Initial cast, will be overwritten by fetch
  );
  const [isLoadingVacations, setIsLoadingVacations] = useState(true);
  const [vacationsError, setVacationsError] = useState<string | null>(null);

  // Fetch existing vacations from the API
  useEffect(() => {
    async function fetchVacations() {
      setIsLoadingVacations(true);
      setVacationsError(null);
      try {
        const response = await fetch('/api/vacations');
        if (response.ok) {
          const vacationsData = await response.json();
          console.log(
            '[useExistingVacations] Fetched vacations:',
            vacationsData.length,
            'entries',
          );
          setExistingVacations(vacationsData);
        } else {
          console.error(
            '[useExistingVacations] Failed to fetch vacations:',
            response.status,
          );
          setVacationsError(
            `Failed to load existing vacations (${response.status})`,
          );
          // Fall back to initial props if fetch fails
          if (initialVacations.length > 0) {
            console.log(
              '[useExistingVacations] Using prop-provided vacations after fetch failure:',
              initialVacations.length,
              'entries',
            );
            setExistingVacations(initialVacations as VacationBooking[]);
          } else {
            setExistingVacations([]); // Ensure it's an empty array if fetch fails and no initial data
          }
        }
      } catch (error) {
        console.error(
          '[useExistingVacations] Error fetching vacations:',
          error,
        );
        setVacationsError(
          error instanceof Error
            ? error.message
            : 'An unknown error occurred fetching vacations',
        );
        // Fall back to initial props if fetch fails
        if (initialVacations.length > 0) {
          console.log(
            '[useExistingVacations] Using prop-provided vacations after error:',
            initialVacations.length,
            'entries',
          );
          setExistingVacations(initialVacations as VacationBooking[]);
        } else {
          setExistingVacations([]); // Ensure it's an empty array if fetch fails and no initial data
        }
      } finally {
        setIsLoadingVacations(false);
      }
    }

    void fetchVacations();
  }, [initialVacations]); // Rerun if initialVacations prop changes (though unlikely needed)

  // Create shouldDisableDate function using the fetched vacations and holiday map
  const shouldDisableDate = useMemo(
    () => createShouldDisableDate(bankHolidayMap, existingVacations),
    [bankHolidayMap, existingVacations],
  );

  // Convert existingVacations to VacationBooking type for MiniCalendar (or other uses)
  // This might be redundant if existingVacations is already correctly typed after fetch
  const formattedVacations: VacationBooking[] = useMemo(() => {
    console.log(
      '[useExistingVacations] Formatting existingVacations:',
      existingVacations.length,
      'entries',
    );
    // Ensure the data conforms to VacationBooking, adding default/dummy values if needed
    return existingVacations.map((vacation, index) => ({
      id: vacation.id || `existing-vacation-${index}`, // Ensure ID exists
      start_date: vacation.start_date,
      end_date: vacation.end_date,
      is_half_day: vacation.is_half_day || false,
      half_day_portion: vacation.half_day_portion,
      note: vacation.note,
      created_at: vacation.created_at || new Date().toISOString(), // Add default if missing
      userId: vacation.userId || userId, // Ensure userId exists
      // google_event_id is not part of VacationBooking type in types/index.ts
    }));
  }, [existingVacations, userId]);

  return {
    existingVacations,
    formattedVacations,
    shouldDisableDate,
    isLoadingVacations,
    vacationsError,
  };
}
