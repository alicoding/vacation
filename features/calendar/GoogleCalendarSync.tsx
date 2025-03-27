import { useState } from 'react';
import { Switch } from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import { useSession } from '@/lib/auth-helpers';

interface GoogleCalendarSyncProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function GoogleCalendarSync({ enabled, onToggle }: GoogleCalendarSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{text: string; type: 'success' | 'error'} | null>(null);
  const { data: session, status } = useSession();

  const handleSync = async () => {
    if (!session) {
      setMessage({ text: 'Please sign in to sync your calendar', type: 'error' });
      return;
    }

    try {
      setIsSyncing(true);
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync calendar');
      }

      setMessage({ text: enabled ? 'Calendar sync enabled' : 'Calendar sync disabled', type: 'success' });
      onToggle(enabled);
    } catch (error) {
      setMessage({ text: 'Failed to sync calendar. Please try again.', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Google Calendar Sync</h3>
          <p className="text-sm text-gray-500">
            Automatically sync your vacation bookings with Google Calendar
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={(e) => {
            onToggle(e.target.checked);
            handleSync();
          }}
          disabled={isSyncing}
        />
      </div>
      <div className="text-sm text-gray-500">
        {enabled ? 'Calendar sync is enabled' : 'Calendar sync is disabled'}
      </div>
      <Snackbar open={!!message} autoHideDuration={6000} onClose={() => setMessage(null)}>
        <Alert onClose={() => setMessage(null)} severity={message?.type} variant="filled">
          {message?.text}
        </Alert>
      </Snackbar>
    </div>
  );
}