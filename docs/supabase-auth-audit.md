# Supabase Auth Audit & Cleanup Checklist

## Progress Tracking

This document tracks our progress in auditing and cleaning up Supabase authentication in the Vacation Tracker app.

## 1. Identify All Supabase Client Usages ✅

- [x] Search for `createClientComponentClient()`
- [x] Search for `createServerComponentClient()`
- [x] Search for `supabase.auth`, `getUser`, `getSession`, etc.
- [x] Map out all client creation patterns across the codebase

### Fix:
- [x] Make sure all client-side components use a unified client instance
- [x] All server components must use `createSupabaseServerClient(cookies)`

## 2. Eliminate LocalStorage-Based Session Logic ✅

- [x] Look for logic relying on localStorage for tokens or sessions
- [x] Look for `supabase.auth.getSession()` or `onAuthStateChange()` in client

### Fix:
- [x] Move to cookie-based auth only with window.__INITIAL_AUTH_SESSION__ for hydration

## 3. Add a Central getSupabaseClient() Utility ✅

- [x] Create or update `/lib/supabase.ts` with unified client creation functions

### Fix:
- [x] Refactor key components to use centralized client creation utilities

## 4. Build a Universal useUser() Hook ✅

- [x] Create or update hooks for user authentication state

### Fix:
- [x] Replace all direct `supabase.auth.getUser()` calls with the hook

## 5. Verify Server-Side Auth in layout.tsx or Protected Pages ⏳

- [ ] Ensure all protected routes properly check authentication server-side

### Fix:
- [ ] Implement consistent auth checking in layouts/pages
- [ ] Avoid fetching user on the client when server already has it

## 6. Middleware Check ✅

- [x] Verify middleware is correctly handling Supabase cookies
- [x] Ensure proper redirect logic for unauthenticated users

## 7. Standardize Auth Flows ⏳

- [ ] Audit login, register, and logout pages for consistency
- [ ] Check for localStorage remnants in auth flows

### Fix:
- [ ] Clean up and standardize auth flow pages

## 8. Kill All Zombie Copilot Code ⏳

- [ ] Look for unused `supabase.auth.onAuthStateChange()` in components
- [ ] Look for duplicated auth logic across pages/components

### Fix:
- [ ] Consolidate logic into shared auth.ts and useUser.ts

## Components Reviewed & Fixed

- [x] EnvironmentProvider.tsx - Already uses a secure approach with window.__ENV__
- [x] AuthProvider.tsx - Updated to use centralized createSupabaseClient()
- [x] InitialAuthHydration.tsx - Updated to use createSupabaseServerClient()
- [x] middleware.ts - Updated to use createSupabaseMiddlewareClient()
- [x] services/vacation/vacationQueryService.ts - Updated to use createSupabaseServerClient()
- [x] services/vacation/vacationBookingService.ts - Updated to use createSupabaseServerClient() and createServiceClient()
- [x] services/vacation/vacationOverlapService.ts - Updated to use createSupabaseServerClient()
- [x] services/holiday/holidayService.ts - Updated to use createSupabaseServerClient() and createServiceClient()
- [x] app/api/debug/vacations/route.ts - Updated to use centralized client utilities

## Files Created/Updated

- [x] `/lib/supabase.ts` - Created unified client creation utilities with consistent naming
  - `createSupabaseClient()` - For client components (browser)
  - `createSupabaseServerClient()` - For server components with cookie handling
  - `createSupabaseMiddlewareClient()` - Specifically for middleware
  - `createDirectClient()` - For API routes and direct access
  - `createServiceClient()` - For admin operations (bypasses RLS)
- [x] `/lib/hooks/useUser.ts` - Created universal user hook for client components
  - `useUser()` - Main hook for accessing user data
  - `useIsAuthenticated()` - Simplified hook for checking authentication status
- [ ] `/lib/auth-helpers.ts` - Consolidated auth utilities

## Remaining Tasks

1. Check protected routes in layout.tsx and pages to ensure they use server-side authentication consistently
2. Review and standardize authentication flows (login, register, logout)
3. Look for and eliminate any remaining localStorage-based authentication code
4. Check for and consolidate any duplicated authentication logic