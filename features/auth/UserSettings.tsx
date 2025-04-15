'use client';

import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
// Removed useSession import
import { useAuth } from '@/components/auth/AuthProvider'; // Import useAuth
import type { User } from '@/types/auth'; // Keep User type
import GoogleCalendarSync from '@/features/calendar/GoogleCalendarSync';

// Define the extended user interface to match our custom fields
interface ExtendedUser extends User {
  // Make id required to match the Session.user.id requirement
  id: string;
  total_vacation_days?: number;
  province?: string;
  employment_type?: string;
  week_starts_on?: string;
  calendar_sync_enabled?: boolean;
}

const CANADIAN_PROVINCES = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];

const EMPLOYMENT_TYPES = [
  { value: 'standard', label: 'Standard Employee' },
  { value: 'bank', label: 'Bank Staff' },
  { value: 'federal', label: 'Federal Employee' },
];

const WEEK_START_OPTIONS = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
];

export default function UserSettings() {
  // Use the shared AuthContext - add refreshSession
  const {
    user,
    isLoading: isAuthLoading,
    isAuthenticated,
    refreshSession,
  } = useAuth();
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // New state to track if data has been loaded
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [vacationDays, setVacationDays] = useState<number | null>(null);
  const [province, setProvince] = useState<string>('ON');
  const [employmentType, setEmploymentType] = useState<string>('standard');
  const [weekStartsOn, setWeekStartsOn] = useState<string>('sunday');
  const [calendarSyncEnabled, setCalendarSyncEnabled] =
    useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0); // Keep this for local data refresh if needed
  const [isFetchingSettings, setIsFetchingSettings] = useState(true); // Local loading state for API fetch

  // Fetch user data including calendar sync settings
  const fetchUserData = useCallback(async () => {
    // Wait until auth is resolved and user is authenticated
    if (isAuthLoading || !isAuthenticated || !user?.id) {
      // If auth is done loading but user is not authenticated, stop fetching
      if (!isAuthLoading && !isAuthenticated) {
        setIsFetchingSettings(false);
      }
      return;
    }

    // Only show loading state if data hasn't been loaded yet
    if (!dataLoaded) {
      setIsFetchingSettings(true);
    }

    try {
      const response = await fetch('/api/user');
      const rawData: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof rawData === 'object' &&
          rawData !== null &&
          typeof (rawData as any).error === 'string'
            ? (rawData as any).error
            : `Failed to load user settings (${response.status})`;

        console.error('Error fetching user data:', response.status, message);
        setErrorMessage(message);
        setDataLoaded(false);
        return;
      }

      if (
        typeof rawData !== 'object' ||
        rawData === null ||
        typeof (rawData as any).id !== 'string'
      ) {
        throw new Error('Invalid user data format received from API');
      }

      const userData = rawData as ExtendedUser;

      setVacationDays(
        userData.total_vacation_days !== undefined
          ? userData.total_vacation_days
          : 2,
      );
      setProvince(userData.province || 'ON');
      setEmploymentType(userData.employment_type || 'standard');
      setWeekStartsOn(userData.week_starts_on || 'sunday');
      setCalendarSyncEnabled(!!userData.calendar_sync_enabled);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setErrorMessage('An error occurred while loading user settings.');
      setDataLoaded(false); // Indicate data load failed
    } finally {
      setIsFetchingSettings(false);
    }
  }, [user?.id, isAuthenticated, isAuthLoading, dataLoaded]); // Dependencies updated

  useEffect(() => {
    void fetchUserData();
  }, [fetchUserData, refreshKey]); // Use fetchUserData callback

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Ensure user is authenticated before saving
    if (!isAuthenticated || !user?.id) {
      setErrorMessage('You must be signed in to save settings.');
      setIsSaving(false);
      return;
    }

    try {
      // Create Supabase client - not needed for update anymore
      // const supabase = createSupabaseClient();

      // Call the backend API which handles both Supabase auth and DB updates
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          total_vacation_days: vacationDays,
          province,
          employment_type: employmentType,
          week_starts_on: weekStartsOn,
          calendar_sync_enabled: calendarSyncEnabled,
        }),
      });

      if (!response.ok) {
        // Try to parse error message from backend
        let errorMsg = `Failed to update settings (status: ${response.status})`;
        try {
          const response = await fetch('/api/user/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              total_vacation_days: vacationDays,
              province,
              employment_type: employmentType,
              week_starts_on: weekStartsOn,
              calendar_sync_enabled: calendarSyncEnabled,
            }),
          });

          const rawData: unknown = await response.json();

          if (!response.ok) {
            const errorMsg =
              typeof rawData === 'object' &&
              rawData !== null &&
              typeof (rawData as any).error === 'string'
                ? (rawData as any).error
                : `Failed to update settings (status: ${response.status})`;

            throw new Error(errorMsg);
          }
        } catch (parseError) {
          // Ignore if response body is not JSON or empty
        }
        throw new Error(errorMsg);
      }

      setSuccessMessage('Settings updated successfully');

      // Refresh the global auth context user data
      await refreshSession();

      // Optionally trigger local data refresh if still needed (e.g., for calendar sync status)
      setRefreshKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update settings',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCalendarSync = (enabled: boolean) => {
    setCalendarSyncEnabled(enabled);
    // Trigger a refetch of user data after the toggle action completes
    // This ensures the local state aligns with the database state updated by GoogleCalendarSync's API call
    setRefreshKey((prevKey) => prevKey + 1);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Your Settings
      </Typography>

      {/* Use combined loading state */}
      {isAuthLoading || isFetchingSettings ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <form onSubmit={(e) => void handleSaveSettings(e)}>
            <Box sx={{ mb: 3 }}>
              <TextField
                id="vacationDays"
                label="Annual Vacation Days"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 365 }}
                value={vacationDays === null ? '' : vacationDays}
                onChange={(e) =>
                  setVacationDays(parseInt(e.target.value, 10) || 0)
                }
                margin="normal"
                size="small"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel id="province-label">Province</InputLabel>
                <Select
                  labelId="province-label"
                  id="province"
                  value={province}
                  label="Province"
                  onChange={(e) => setProvince(e.target.value)}
                >
                  {CANADIAN_PROVINCES.map((prov) => (
                    <MenuItem key={prov.value} value={prov.value}>
                      {prov.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  This determines which provincial holidays are displayed in
                  your calendar.
                </FormHelperText>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel id="employment-type-label">
                  Employment Type
                </InputLabel>
                <Select
                  labelId="employment-type-label"
                  id="employment-type"
                  value={employmentType}
                  label="Employment Type"
                  onChange={(e) => setEmploymentType(e.target.value)}
                >
                  {EMPLOYMENT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Your employment type affects which holidays are applicable to
                  you.
                </FormHelperText>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel id="week-start-label">Week Starts On</InputLabel>
                <Select
                  labelId="week-start-label"
                  id="week-start"
                  value={weekStartsOn}
                  label="Week Starts On"
                  onChange={(e) => setWeekStartsOn(e.target.value)}
                >
                  {WEEK_START_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Set which day your calendar week should start with.
                </FormHelperText>
              </FormControl>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={isSaving}
              sx={{ mt: 2, mb: 4 }}
            >
              {isSaving ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Calendar Integration
          </Typography>

          <Box mb={3}>
            <Paper elevation={1}>
              <GoogleCalendarSync
                enabled={calendarSyncEnabled}
                onToggle={handleToggleCalendarSync}
              />
            </Paper>
          </Box>
        </>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
