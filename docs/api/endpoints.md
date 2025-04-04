# API Endpoints Documentation

This document outlines the available API endpoints in the Vacation Tracker application.

## Vacations

### Get User Vacations

**Endpoint:** `GET /api/vacations`

**Authentication Required:** Yes

**Description:** Fetches all vacation bookings for the authenticated user.

**Response:**

```json
[
  {
    "id": "cuid",
    "userId": "user_id",
    "start_date": "2023-01-01T00:00:00.000Z",
    "end_date": "2023-01-03T00:00:00.000Z",
    "note": "New Year vacation",
    "created_at": "2022-12-15T00:00:00.000Z"
  }
]
```

### Create Vacation Booking

**Endpoint:** `POST /api/vacations`

**Authentication Required:** Yes

**Description:** Creates a new vacation booking for the authenticated user.

**Request Body:**

```json
{
  "startDate": "2023-01-01",
  "endDate": "2023-01-03",
  "note": "Optional note about the vacation"
}
```

**Validation:**

- Start date and end date are required
- Start date must be before end date
- Cannot book on weekends or bank holidays

**Response:**

```json
{
  "id": "cuid",
  "userId": "user_id",
  "start_date": "2023-01-01T00:00:00.000Z",
  "end_date": "2023-01-03T00:00:00.000Z",
  "note": "New Year vacation",
  "created_at": "2022-12-15T00:00:00.000Z"
}
```

### Update Vacation

**Endpoint:** `PUT /api/vacations/:id`

**Authentication Required:** Yes

**Description:** Updates an existing vacation booking.

**Request Body:**

```json
{
  "startDate": "2023-01-02",
  "endDate": "2023-01-04",
  "note": "Updated note"
}
```

**Response:** Updated vacation booking object

### Delete Vacation

**Endpoint:** `DELETE /api/vacations/:id`

**Authentication Required:** Yes

**Description:** Deletes a vacation booking.

**Response:** Success message

## Holidays

### Get Holidays

**Endpoint:** `GET /api/holidays`

**Authentication Required:** Yes

**Description:** Fetches holidays for a specified date range and province.

**Query Parameters:**

- `startDate` (optional): Start date for holiday range (default: Jan 1 of current year)
- `endDate` (optional): End date for holiday range (default: Dec 31 of current year)
- `province` (optional): Province code (default: user's province)

**Response:**

```json
[
  {
    "id": "cuid",
    "date": "2023-01-01",
    "name": "New Year's Day",
    "province": null,
    "type": "bank"
  },
  {
    "id": "cuid",
    "date": "2023-02-20",
    "name": "Family Day",
    "province": "ON",
    "type": "provincial"
  }
]
```

### Sync Holidays

**Endpoint:** `POST /api/holidays`

**Authentication Required:** Yes

**Description:** Force synchronizes holidays for a specific year from the holidays data provider.

**Request Body:**

```json
{
  "year": 2023
}
```

**Response:**

```json
{
  "success": true,
  "message": "Holidays synced for 2023"
}
```

## User

### Get User Profile

**Endpoint:** `GET /api/user`

**Authentication Required:** Yes

**Description:** Fetches the authenticated user's profile information.

**Response:**

```json
{
  "id": "cuid",
  "name": "User Name",
  "email": "user@example.com",
  "total_vacation_days": 14,
  "province": "ON"
}
```

### Update User Preferences

**Endpoint:** `PUT /api/user/preferences`

**Authentication Required:** Yes

**Description:** Updates the user's preferences.

**Request Body:**

```json
{
  "total_vacation_days": 20,
  "province": "BC"
}
```

**Response:** Updated user object
