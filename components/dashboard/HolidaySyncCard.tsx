'use client';

import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
} from '@mui/material';
import HolidayOverviewCard from './HolidayOverviewCard';

interface HolidaySyncCardProps {
  userProvince: string;
  employmentType?: string;
}

const HolidaySyncCard: React.FC<HolidaySyncCardProps> = ({
  userProvince,
  employmentType = 'standard',
}) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() + i - 2,
  );

  const handleSync = async () => {
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year }),
      });

      const responseData: unknown = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof responseData === 'object' &&
          responseData !== null &&
          typeof (responseData as any).error === 'string'
            ? (responseData as any).error
            : 'Failed to sync holidays';

        throw new Error(errorMessage);
      }

      // Runtime validation for success response
      if (
        typeof responseData !== 'object' ||
        responseData === null ||
        typeof (responseData as any).success !== 'boolean' ||
        typeof (responseData as any).message !== 'string'
      ) {
        throw new Error('Invalid response format from holiday sync API');
      }

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full">
      <h2 className="text-lg font-medium text-gray-900 mb-4">
        Holiday Synchronization
      </h2>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Sync holidays for a specific year from our holiday data provider. This
          will update holidays for {userProvince} and nationwide holidays.
        </p>

        <div className="flex items-end gap-4 mt-4">
          <TextField
            select
            label="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-32"
            size="small"
          >
            {years.map((yearOption) => (
              <MenuItem key={yearOption} value={yearOption}>
                {yearOption}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            onClick={() => {
              void handleSync();
            }}
            disabled={loading}
            className="flex items-center gap-2"
            color="primary"
          >
            {loading ? (
              <>
                <CircularProgress size={16} className="mr-2" />
                Syncing...
              </>
            ) : (
              'Sync Holidays'
            )}
          </Button>
        </div>
      </div>

      {success && (
        <Alert severity="success" className="mt-4">
          Holidays for {year} have been successfully synchronized.
        </Alert>
      )}

      {error && (
        <Alert severity="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-6">
        <HolidayOverviewCard
          province={userProvince}
          employmentType={employmentType}
        />
      </div>
    </div>
  );
};

export default HolidaySyncCard;
