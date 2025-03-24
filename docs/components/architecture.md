# Component Architecture

This document outlines the component architecture of the Vacation Tracker application.

## Directory Structure

```
components/
├── dashboard/
│   ├── HolidayOverviewCard.tsx
│   ├── HolidaySyncCard.tsx
│   ├── MiniCalendar.tsx
│   ├── Sidebar.tsx
│   ├── UpcomingVacationsCard.tsx
│   └── VacationStatsCard.tsx
├── vacation/
│   ├── VacationForm.tsx
│   └── VacationList.tsx
├── Header.tsx
└── Sidebar.tsx
```

## Core Components

### Layout Components

#### Header.tsx
Global application header that includes the user dropdown menu, app title, and navigation elements.

#### Sidebar.tsx
Main application sidebar with navigation links and mini-calendar. Used in the dashboard layout.

### Dashboard Components

#### VacationStatsCard.tsx
Displays vacation statistics including:
- Total vacation days
- Used vacation days
- Booked vacation days
- Remaining vacation days

Includes progress bars for visual representation of vacation usage.

#### UpcomingVacationsCard.tsx
Shows upcoming vacations with:
- Date ranges
- Duration information
- Special indicators for long weekends
- Information about adjacent holidays
- Notes associated with the vacation

#### HolidayOverviewCard.tsx
Displays upcoming holidays with:
- Holiday name
- Date
- Type (bank holiday or provincial)
- Visual indicators distinguishing types

#### HolidaySyncCard.tsx
Provides functionality to synchronize holidays for a specific year:
- Year selector
- Sync button
- Success/error feedback
- Province-specific holiday data

#### MiniCalendar.tsx
A compact calendar shown in the sidebar that displays:
- Current month view
- Indicators for booked vacations
- Holidays highlighted
- Current day indicator

### Vacation Components

#### VacationForm.tsx
Form for creating or editing vacation bookings:
- Date range picker
- Note field
- Validation to prevent booking on weekends/holidays
- Success/error feedback

#### VacationList.tsx
Displays a list of vacation bookings with:
- Date ranges
- Duration information
- Edit and delete options
- Filtering options

## Component Patterns

### Data Fetching
Components use a mix of server-side data fetching and client-side hooks:
- Server components fetch data during rendering
- Client components use custom hooks like `useHolidays` for data fetching

### State Management
- React's built-in state management via hooks
- NextAuth for authentication state
- Custom hooks for domain-specific state (e.g., holidays)

### Error Handling
Components implement error states with:
- Loading indicators
- Error messages
- Graceful fallbacks

### Styling
- Tailwind CSS for utility-based styling
- Material UI components for complex UI elements
- Consistent color schemes:
  - Primary: Used for main actions and highlighting
  - Orange/Yellow: Used for bank holidays and warnings
  - Purple: Used for provincial holidays and special events
  - Green: Used for success states and available days

## Custom Hooks

### useHolidays
Located in `lib/hooks/useHolidays.ts`, this hook:
- Fetches holidays for a date range and province
- Provides loading and error states
- Includes utility functions for checking if a date is a holiday
- Handles caching to reduce API calls

## Component Integration

Components are integrated through:
1. Layout components like app/dashboard/layout.tsx
2. Page components like app/dashboard/page.tsx
3. Card-based dashboard sections
4. Specialized forms and lists

The application follows a modular approach where:
- Components have single responsibilities
- Data flows from parent to child
- Common functionality is extracted into hooks
- UI elements are consistent across the application 