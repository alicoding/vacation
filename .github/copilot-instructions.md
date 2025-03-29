# Vacation Tracker App - Development Guidelines

## Project Overview

This is a personal vacation tracking web app built with Next.js 15+, Supabase, and MUI Core.

The app allows users to:
- Track and manage vacation days
- View holidays and plan time off accordingly
- Sync vacation data with Google Calendar
- View a dashboard with statistics and upcoming events

## Technical Requirements

- **Edge Compatibility**: The app must be fully edge-compatible for deployment on Cloudflare Pages/Workers.
- **Authentication**: Uses Supabase Auth with Google as the federated login provider.
- **Database**: Uses Supabase PostgreSQL for data storage.
- **Google Integration**: Includes Google Calendar integration (read/write) using tokens stored in Supabase.
- **UI Framework**: Uses MUI Core components throughout the application.
- **Runtime**: Avoids Node-only APIs in favor of edge-compatible alternatives.
- **Date Library**: Uses Luxon exclusively for all date manipulation and formatting.

## Application Architecture

### Authentication Flow
1. User signs in with Google via Supabase OAuth
2. Tokens are securely stored in the `google_tokens` table
3. AuthProvider context makes auth state available throughout the app
4. Protected routes check for authenticated sessions via middleware

### Directory Structure
- `/app` - App Router components and routes
- `/pages` - Legacy Pages Router (for backward compatibility)
- `/components` - Reusable UI components
- `/features` - Feature-based components (auth, calendar, etc.)
- `/utils` - Utility functions including Supabase clients
- `/types` - TypeScript type definitions
- `/lib` - Core business logic and services

### Key Files
- `utils/supabase.ts` - Supabase client creation for different contexts
- `utils/supabase-server.ts` - Server-specific Supabase client
- `components/auth/AuthProvider.tsx` - Auth context provider
- `lib/auth-helpers.ts` - Authentication utility functions
- `middleware.ts` - Route protection and session handling

## Coding Standards

### TypeScript
- Use TypeScript for all files
- Explicitly type all variables, functions, props, and return values when not inferrable
- Use type-safe practices—avoid `any`, prefer strong typing over convenience
- Create and maintain comprehensive type definitions in `/types`

### Naming and Formatting
- Use camelCase for variables and function names
- Use PascalCase for React components and type definitions
- Use single quotes for strings
- Use 2 spaces for indentation
- Use kebab-case for file names, except for component files which use PascalCase

### Component Structure
- Keep component files under 300 lines of code
- Break down large components into smaller, focused components
- Factor out reusable logic into custom hooks or utility functions
- Create dedicated utility components for repetitive UI patterns
- Consider splitting complex forms into multiple component files

### Date Handling
- Use Luxon DateTime exclusively for all date manipulation and formatting
- Avoid mixing native Date objects with Luxon - convert consistently
- Use appropriate timezone handling with Luxon's zone capabilities
- Follow consistent date formatting patterns across the application
- Document date format expectations in component props

### Functional Patterns
- Use arrow functions for all callbacks
- Use async/await for asynchronous logic
- Use const by default; use let only if reassignment is needed
- Prefer object/array destructuring
- Use template literals for string interpolation
- Use modern ES6+ syntax and patterns

### React Patterns
- Use functional components with hooks
- Split UI into smaller, reusable components
- Co-locate related components and logic
- Use client/server component patterns appropriately
- Use the AuthProvider for authentication state management

### MUI Usage
- Follow MUI theming and composition best practices
- Use MUI's sx prop for component-specific styling
- Define a consistent theme in providers.tsx
- Prefer MUI components over custom HTML elements

### Edge Compatibility
- Avoid Node-specific APIs (fs, path, etc.)
- Use edge-safe data fetching patterns
- Keep server-specific code in designated server components
- Ensure all API routes use edge runtime

## Supabase Integration

### Auth
- Use `createBrowserSupabaseClient()` for client components
- Use `createServerClient()` for server components
- Use `createDirectClient()` for direct API access
- Protect routes using the middleware

### Database
- Define strong types for all tables in Database type
- Use RLS policies in Supabase for security
- Follow the schema defined in the Database type
