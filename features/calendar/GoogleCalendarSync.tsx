'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Switch,
  Button,
  Box,
  CircularProgress,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import { useAuth } from '@/components/auth/AuthProvider'; // Use AuthProvider context
import { hasCalendarAuthorization } from '@/utils/googleCalendar';
import { RefreshRounded, Check, ErrorOutline } from '@mui/icons-material';
import { useSearchParams } from 'next/navigation';

interface GoogleCalendarSyncProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function GoogleCalendarSync({
  enabled,
  onToggle,
}: GoogleCalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [hasAuthorization, setHasAuthorization] = useState<boolean | null>(
    null,
  );
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false);
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth(); // Use values from useAuth
  const searchParams = useSearchParams();

  // Check URL for success/error params
  useEffect(() => {
    if (!searchParams) return;

    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const details = searchParams.get('details');

    if (success === 'true') {
      setMessage({
        text: 'Google Calendar authorization successful! You can now sync your vacations.',
        type: 'success',
      });
      // Trigger a refresh of the authorization status
      void checkAuthorization();
    } else if (error) {
      setMessage({
        text: `Google Calendar authorization failed: ${error}${details ? ` (${details})` : ''}`,
        type: 'error',
      });
    }
  }, [searchParams]);

  // Check if user has authorized Google Calendar access
  const checkAuthorization = useCallback(async () => {
    // Check authentication status from useAuth
    if (!isAuthenticated || !user?.id) {
      setHasAuthorization(false);
      setIsCheckingAuth(false);
      setHasCheckedOnce(true);
      return;
    }

    try {
      setIsCheckingAuth(true);
      // API call to check if user has authorized Google Calendar
      const response = await fetch('/api/calendar/auth/check');
      if (response.ok) {
        const { authorized } = await response.json();
        setHasAuthorization(authorized);
      } else {
        setHasAuthorization(false);
      }
    } catch (error) {
      console.error('Error checking calendar authorization:', error);
      setHasAuthorization(false);
    } finally {
      setIsCheckingAuth(false);
      setHasCheckedOnce(true);
    }
  }, [isAuthenticated, user?.id]); // Update dependencies

  // Only run the check once on initial component mount and when user ID changes
  useEffect(() => {
    // Check auth status before initial check
    if (!hasCheckedOnce && isAuthenticated && user?.id) {
      void checkAuthorization();
    }
  }, [checkAuthorization, isAuthenticated, user?.id, hasCheckedOnce]); // Update dependencies

  const handleSync = async (newEnabledState: boolean) => {
    // Accept new state as argument
    // Prevent concurrent executions if already syncing
    if (isSyncing) {
      console.warn(
        '[handleSync] Sync already in progress. Ignoring duplicate trigger.',
      );
      return;
    }

    // Check authentication status
    if (!isAuthenticated) {
      setMessage({
        text: 'Please sign in to sync your calendar',
        type: 'error',
      });
      return;
    }

    // If trying to enable without authorization, redirect
    if (newEnabledState && !hasAuthorization) {
      redirectToGoogleAuth();
      return;
    }

    try {
      setIsSyncing(true);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newEnabledState }), // Send the new state to API
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (
          response.status === 401 ||
          errorData.message?.includes('not authorized')
        ) {
          setHasAuthorization(false);
          throw new Error('Google Calendar access not authorized');
        }

        throw new Error('Failed to sync calendar');
      }

      const data = await response.json();
      setMessage({
        text: newEnabledState // Use new state for message
          ? `Calendar sync enabled. Synced ${data.results?.successful || 0} vacations.`
          : 'Calendar sync disabled',
        type: 'success',
      });

      onToggle(newEnabledState); // Call onToggle with the successfully processed state
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to sync calendar';

      if (errorMessage.includes('not authorized')) {
        setMessage({
          text: 'Google Calendar access not authorized. Please authorize access first.',
          type: 'error',
        });
      } else {
        setMessage({
          text: `${errorMessage}. Please try again.`,
          type: 'error',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const redirectToGoogleAuth = () => {
    // Store current URL to return after auth
    localStorage.setItem('calendarAuthRedirect', window.location.pathname);

    // Redirect to the Google auth endpoint
    window.location.href = '/api/calendar/auth/authorize';
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Google Calendar Sync</h3>
          <p className="text-sm text-gray-500">
            Automatically sync your vacation bookings with Google Calendar
          </p>

          {hasCheckedOnce && !isCheckingAuth && (
            <Box mt={1}>
              <Chip
                size="small"
                icon={hasAuthorization ? <Check /> : <ErrorOutline />}
                label={
                  hasAuthorization
                    ? 'Connected to Google Calendar'
                    : 'Not connected'
                }
                color={hasAuthorization ? 'success' : 'default'}
                variant={hasAuthorization ? 'filled' : 'outlined'}
              />
            </Box>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasCheckedOnce || isCheckingAuth ? (
            <CircularProgress size={24} /> // Show spinner while checking
          ) : (
            // Show Switch if check is done, regardless of hasAuthorization (if enabled is true)
            // The handleSync function will manage the authorization flow if needed when enabling
            <Switch
              checked={enabled}
              onChange={(e) => void handleSync(e.target.checked)}
              disabled={isSyncing || isCheckingAuth} // Disable while syncing or initial check
            />
          )}

          {hasCheckedOnce && !isCheckingAuth && (
            <Button
              size="small"
              onClick={() => void checkAuthorization()}
              disabled={isCheckingAuth}
              startIcon={<RefreshRounded />}
              sx={{ minWidth: 'auto', ml: 1, p: '4px' }}
            >
              Refresh
            </Button>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {/* Status Text Logic */}
        {
          !hasCheckedOnce || isCheckingAuth ? (
            'Checking Google Calendar access...'
          ) : !hasAuthorization && enabled ? (
            // User wants sync enabled, but current check shows no authorization
            <Box sx={{ color: 'warning.main', fontWeight: 'medium' }}>
              Sync enabled, but Google connection needs refresh or
              re-authorization.
            </Box>
          ) : !hasAuthorization && !enabled ? (
            // Not authorized, not enabled - standard message
            <Box sx={{ color: 'error.main', fontWeight: 'medium' }}>
              Google Calendar access not authorized. Please authorize access
              first.
            </Box>
          ) : hasAuthorization ? ( // Only show simple enabled/disabled if authorized
            enabled ? (
              'Calendar sync is enabled'
            ) : (
              'Calendar sync is disabled'
            )
          ) : null /* Should not happen with above conditions, but good practice */
        }
      </div>

      {isSyncing && (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={16} />
          <Typography variant="body2">
            Syncing with Google Calendar...
          </Typography>
        </Box>
      )}

      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity={message?.type}
          variant="filled"
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </div>
  );
}
