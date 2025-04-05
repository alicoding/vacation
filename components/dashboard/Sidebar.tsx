'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider'; // Use AuthProvider context
import Link from 'next/dist/client/app-dir/link';
import {
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Divider,
  IconButton,
  Paper,
  Stack,
  Collapse,
  Drawer,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChevronDoubleLeftIcon from '@heroicons/react/24/outline/ChevronDoubleLeftIcon';
import ChevronDoubleRightIcon from '@heroicons/react/24/outline/ChevronDoubleRightIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import MiniCalendar from './MiniCalendar';
import { VacationBooking } from '@/types'; // Keep VacationBooking from @/types
import { DateTime } from 'luxon';
import { calculateVacationStats } from '@/services/vacation/vacationCalculationUtils'; // Import the centralized function
import { HolidayWithTypeArray } from '@/services/holiday/holidayService'; // Import HolidayWithTypeArray

// Custom type for extended session user with total_vacation_days
interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  total_vacation_days?: number;
}

// Type for navigation links
interface NavLink {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
      titleId?: string;
    }
  >;
}

export default function DashboardSidebar() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth(); // Use values from useAuth
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [holidays, setHolidays] = useState<HolidayWithTypeArray[]>([]); // Use HolidayWithTypeArray for state
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [vacationStats, setVacationStats] = useState({
    used: 0,
    booked: 0,
    remaining: 0,
  });

  // Navigation links for the sidebar - properly typed
  const navLinks: NavLink[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    {
      name: 'Request Vacation',
      href: '/dashboard/vacations',
      icon: CalendarIcon,
    },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
  ];

  // Function to determine if a nav link is active
  const isActive = (path: string): boolean =>
    pathname === path ||
    (path !== '/dashboard' && (pathname || '').startsWith(path));

  // useEffect for fetching data
  useEffect(() => {
    async function fetchData() {
      if (!isAuthenticated || !user?.id) return;

      try {
        // Fetch holidays
        const holidaysResponse = await fetch('/api/holidays');
        if (holidaysResponse.ok) {
          const holidaysData = await holidaysResponse.json();
          // Map fetched data (assuming string dates) to HolidayWithTypeArray (with Date objects)
          const holidaysWithDateObjects: HolidayWithTypeArray[] =
            holidaysData.map((h: any) => ({
              ...h,
              date: DateTime.fromISO(String(h.date), {
                zone: 'utc',
              }).toJSDate(), // Convert string to Date
              // Ensure 'type' is an array, handle potential string data from API
              type:
                typeof h.type === 'string'
                  ? [h.type]
                  : Array.isArray(h.type)
                    ? h.type
                    : [],
            }));
          setHolidays(holidaysWithDateObjects);
        } else {
          console.error(
            'Failed to fetch holidays:',
            holidaysResponse.statusText,
          );
          setHolidays([]); // Reset or handle error state
        }

        // Fetch vacation bookings
        const vacationsResponse = await fetch('/api/vacations');
        if (vacationsResponse.ok) {
          const vacationsData = await vacationsResponse.json();
          setVacations(vacationsData);
        } else {
          console.error(
            'Failed to fetch vacations:',
            vacationsResponse.statusText,
          );
          setVacations([]); // Reset or handle error state
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
        // Optionally reset states on error
        setHolidays([]);
        setVacations([]);
      }
    }

    void fetchData();
  }, [isAuthenticated, user?.id]); // Dependencies for fetching

  // useEffect for calculating stats using the centralized function
  useEffect(() => {
    // Define an async function inside useEffect to handle the async calculation
    const calculateAndSetStats = () => {
      if (user?.total_vacation_days && holidays && vacations) {
        // Call the centralized async function with await
        const stats = calculateVacationStats(
          user.total_vacation_days,
          vacations,
          holidays, // Pass the state which is now HolidayWithTypeArray[]
        );

        // Update the state with the awaited stats
        setVacationStats({
          used: stats.used,
          booked: stats.used, // Assuming booked is the same as used business days
          remaining: stats.remaining,
        });
      } else if (user?.total_vacation_days) {
        // Handle the case where data isn't fully loaded yet (keep this part)
        setVacationStats({
          used: 0,
          booked: 0,
          remaining: user.total_vacation_days,
        });
      }
    };

    // Call the inner async function
    void calculateAndSetStats();
    // The original else if condition is handled inside calculateAndSetStats, so remove the duplicated block below
    // Dependencies remain the same: recalculate when holidays, vacations, or total days change
  }, [holidays, vacations, user?.total_vacation_days]);

  // Remove parseHolidayDate function as dates in state are now Date objects

  // Get upcoming holidays (next 3) using the Date objects directly
  const upcomingHolidays = holidays
    .map((holiday) => ({
      ...holiday,
      // Convert Date object to Luxon DateTime for comparison/formatting
      luxonDate: DateTime.fromJSDate(holiday.date, { zone: 'utc' }),
    }))
    .filter(
      (holiday) =>
        holiday.luxonDate.isValid && // Check validity
        holiday.luxonDate >= DateTime.now().startOf('day'), // Compare with now
    )
    .sort((a, b) => a.luxonDate.toMillis() - b.luxonDate.toMillis()) // Sort using Luxon objects
    .slice(0, 3);

  // Create a wrapper component to handle HeroIcon with MUI props
  const IconWrapper = ({
    icon: Icon,
    sx,
  }: {
    icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
    sx?: Record<string, unknown>;
  }) => {
    return (
      <Icon
        style={{
          height: sx?.height as string | number,
          width: sx?.width as string | number,
          marginRight: sx?.mr as string | number,
        }}
      />
    );
  };

  return (
    <Paper
      component={Box}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
      >
        {!collapsed && (
          <Box>
            <Typography variant="h6">Vacation App</Typography>
          </Box>
        )}
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? (
            <ChevronDoubleRightIcon style={{ height: 20, width: 20 }} />
          ) : (
            <ChevronDoubleLeftIcon
              style={{ height: 20, width: 20, color: 'rgba(0, 0, 0, 0.6)' }}
            />
          )}
        </IconButton>
      </Box>

      <Drawer
        variant="permanent"
        open={!collapsed}
        sx={{
          position: 'relative',
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            position: 'relative',
            border: 'none',
            boxSizing: 'border-box',
            width: collapsed ? 'auto' : 240,
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          <List>
            {navLinks.map((link) => (
              <ListItem key={link.name} disablePadding>
                <ListItemButton
                  component={Link}
                  href={link.href}
                  selected={isActive(link.href)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: isActive(link.href)
                      ? 'action.selected'
                      : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40 }}>
                    <IconWrapper
                      icon={link.icon}
                      sx={{ height: 20, width: 20, mr: collapsed ? 0 : 1 }}
                    />
                  </ListItemIcon>
                  {!collapsed && <ListItemText primary={link.name} />}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {!collapsed && user?.total_vacation_days && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          {(() => {
            // Display logic uses vacationStats state, which is updated by the calculation useEffect
            const totalDays = user.total_vacation_days || 0;
            const usedDays = vacationStats.used; // Use calculated 'used' days
            const remainingDays = vacationStats.remaining;
            const usedPercentage =
              totalDays > 0
                ? Math.min(100, Math.round((usedDays / totalDays) * 100))
                : 0;
            const remainingPercentage =
              totalDays > 0
                ? Math.min(100, Math.round((remainingDays / totalDays) * 100))
                : 0;

            return (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  Total Vacation Days
                </Typography>
                <Typography variant="h4" color="primary.main" sx={{ mb: 2 }}>
                  {totalDays}
                </Typography>

                <Stack spacing={1}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Used</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {usedDays} days ({usedPercentage}%)
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Remaining</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {remainingDays} days ({remainingPercentage}%)
                    </Typography>
                  </Box>
                </Stack>
              </>
            );
          })()}
        </Box>
      )}

      {!collapsed && upcomingHolidays && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Upcoming Holidays
          </Typography>

          {upcomingHolidays.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {upcomingHolidays.map(
                (holiday) =>
                  // Check if parsedDate is valid before rendering
                  // Use the luxonDate property for validity check
                  holiday.luxonDate.isValid && (
                    <Box
                      key={holiday.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        opacity: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {holiday.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {/* Format the pre-parsed date */}
                          {/* Format the Luxon DateTime object */}
                          {holiday.luxonDate.toFormat('M/d/yyyy')}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          holiday.type.includes('Bank')
                            ? 'Bank'
                            : holiday.type.includes('Public')
                              ? 'Public'
                              : holiday.type[0] || 'Holiday'
                        }
                        color={
                          holiday.type.includes('Bank')
                            ? 'warning'
                            : holiday.type.includes('Public')
                              ? 'secondary'
                              : 'default'
                        }
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.675rem' }}
                      />
                    </Box>
                  ),
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No upcoming holidays
            </Typography>
          )}

          {/* Add compact legend */}
          <Box
            sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'warning.main',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Bank Holiday
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'secondary.main',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Provincial
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
