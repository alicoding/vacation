# Supabase Database Setup

This folder contains the database migration scripts for setting up the Supabase database.

## Tables Structure

The application uses the following tables:

- `holidays` - Stores holiday information
- `vacation_bookings` - Stores user vacation bookings
- `google_tokens` - Stores Google OAuth tokens for calendar integration

## How to Apply Migrations

1. Navigate to the Supabase dashboard for your project
2. Go to the SQL Editor
3. Click "New Query"
4. Copy the contents of the migration file in `migrations/` and paste it into the query editor
5. Run the query

Alternatively, if you have the Supabase CLI installed:

```bash
supabase db push
```

## Data Model

### holidays

- `id`: UUID (Primary Key)
- `name`: Text (Name of the holiday)
- `date`: Date (Date of the holiday)
- `year`: Integer (Year of the holiday)
- `province`: Text (Province code, null for national holidays)
- `type`: Text (Type of holiday)
- `description`: Text (Optional description)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### vacation_bookings

- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `start_date`: Date (Start date of the vacation)
- `end_date`: Date (End date of the vacation)
- `note`: Text (Optional note)
- `is_half_day`: Boolean (Whether this is a half-day booking)
- `half_day_portion`: Text (Morning or Afternoon, for half-day bookings)
- `google_event_id`: Text (ID of the Google Calendar event, if synced)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### google_tokens

- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `access_token`: Text (OAuth access token)
- `refresh_token`: Text (OAuth refresh token)
- `expires_at`: Timestamp (When the access token expires)
- `created_at`: Timestamp
- `updated_at`: Timestamp
