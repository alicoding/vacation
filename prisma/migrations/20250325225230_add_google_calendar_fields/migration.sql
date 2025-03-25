-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendar_sync_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "google_calendar_id" TEXT;

-- AlterTable
ALTER TABLE "VacationBooking" ADD COLUMN     "googleEventId" TEXT;
