# Database Schema Documentation

This document outlines the database schema for the Vacation Tracker application. The application uses Supabase.

## Models

### User

Represents a user of the application.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| id | String | Primary key, auto-generated UUID | `uuid_generate_v4()` |
| name | String | User's display name | null (optional) |
| email | String | User's email address, unique | null (optional) |
| emailVerified | DateTime | Timestamp when email was verified | null (optional) |
| image | String | URL to user's profile image | null (optional) |
| total_vacation_days | Int | Total vacation days allowed per year | 14 |
| province | String | User's province code (e.g., "ON" for Ontario) | "ON" |
| accounts | Relation | Associated OAuth accounts | [] |
| sessions | Relation | User's sessions | [] |
| vacationBookings | Relation | User's vacation bookings | [] |

### Account

Stores OAuth account information linked to a user.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key, auto-generated UUID |
| userId | String | Foreign key to User |
| type | String | Account type (e.g., "oauth") |
| provider | String | OAuth provider (e.g., "google") |
| providerAccountId | String | ID from the provider |
| refresh_token | String | OAuth refresh token |
| access_token | String | OAuth access token |
| expires_at | Int | Token expiration timestamp |
| token_type | String | Type of token |
| scope | String | OAuth scopes |
| id_token | String | OAuth ID token |
| session_state | String | Session state |

**Unique constraint:** `[provider, providerAccountId]`

### Session

Represents a user session.

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key, auto-generated UUID |
| sessionToken | String | Session token (unique) |
| userId | String | Foreign key to User |
| expires | DateTime | Session expiration timestamp |

### VacationBooking

Represents a vacation booking made by a user.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| id | String | Primary key, auto-generated UUID | `uuid_generate_v4()` |
| userId | String | Foreign key to User | |
| start_date | DateTime | Vacation start date | |
| end_date | DateTime | Vacation end date | |
| note | String | Optional note about the vacation | null (optional) |
| created_at | DateTime | When the booking was created | `now()` |

### Holiday

Represents a holiday (bank or provincial).

| Field | Type | Description |
|-------|------|-------------|
| id | String | Primary key, auto-generated UUID |
| date | DateTime | Holiday date |
| name | String | Holiday name |
| province | String | Province code (null for national holidays) |
| type | String | Either 'bank' or 'provincial' |

### VerificationToken

Used for email verification.

| Field | Type | Description |
|-------|------|-------------|
| identifier | String | User identifier |
| token | String | Verification token (unique) |
| expires | DateTime | Token expiration timestamp |

**Unique constraint:** `[identifier, token]`

## Relationships

- **User → Account**: One-to-many (a user can have multiple OAuth accounts)
- **User → Session**: One-to-many (a user can have multiple sessions)
- **User → VacationBooking**: One-to-many (a user can have multiple vacation bookings)

## Database Configuration

The database connection is configured via the Supabase dashboard.
