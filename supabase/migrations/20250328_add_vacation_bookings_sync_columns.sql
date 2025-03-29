-- Add Google Calendar sync columns to vacation_bookings table
ALTER TABLE IF EXISTS vacation_bookings 
ADD COLUMN IF NOT EXISTS sync_status TEXT,
ADD COLUMN IF NOT EXISTS google_event_id TEXT,
ADD COLUMN IF NOT EXISTS sync_error TEXT,
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS half_day_portion TEXT;

-- Set default sync_status to 'disabled' for existing records
UPDATE vacation_bookings
SET sync_status = 'disabled'
WHERE sync_status IS NULL;

-- Set default is_half_day to false for existing records
UPDATE vacation_bookings
SET is_half_day = FALSE
WHERE is_half_day IS NULL;

-- Add comment to explain sync_status values
COMMENT ON COLUMN vacation_bookings.sync_status IS 'Possible values: disabled, pending, synced, failed';
COMMENT ON COLUMN vacation_bookings.half_day_portion IS 'Possible values: morning, afternoon';