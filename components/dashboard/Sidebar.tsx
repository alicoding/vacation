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
import { Holiday, VacationBooking } from '@/types';
import { DateTime } from 'luxon';

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
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
          setHolidays(holidaysData);
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

  // useEffect for calculating stats when data is ready
  useEffect(() => {
    // Calculate only when necessary data is available
    if (
      user?.total_vacation_days &&
      holidays.length > 0 &&
      vacations.length > 0
    ) {
      const totalDays = user.total_vacation_days;
      let usedBusinessDays = 0;

      const holidayDateStrings = new Set(
        holidays
          .map((h: Holiday) => {
            const dateStr =
              typeof h.date === 'string' ? h.date : String(h.date);
            const dt = DateTime.fromISO(dateStr, { zone: 'utc' });
            return dt.isValid ? dt.toISODate() : null;
          })
          .filter((d: string | null): d is string => d !== null),
      );

      vacations.forEach((vacation: VacationBooking) => {
        const start = DateTime.fromISO(String(vacation.start_date), {
          zone: 'utc',
        }).startOf('day');
        const end = DateTime.fromISO(String(vacation.end_date), {
          zone: 'utc',
        }).startOf('day');
        let current = start;
        let vacationDuration = 0;

        while (current <= end) {
          const currentDateStr = current.toISODate();
          const isWeekday = current.weekday >= 1 && current.weekday <= 5;
          const isHoliday = currentDateStr
            ? holidayDateStrings.has(currentDateStr)
            : false;

          if (isWeekday && currentDateStr && !isHoliday) {
            vacationDuration += 1;
          }
          current = current.plus({ days: 1 });
        }
        usedBusinessDays += vacationDuration;
      });

      setVacationStats({
        used: usedBusinessDays,
        booked: usedBusinessDays,
        remaining: totalDays - usedBusinessDays,
      });
    } else if (user?.total_vacation_days) {
      // If user data is present but holidays/vacations aren't (yet), show initial state
      setVacationStats({
        used: 0,
        booked: 0,
        remaining: user.total_vacation_days,
      });
    }
    // Recalculate when holidays, vacations, or total days change
  }, [holidays, vacations, user?.total_vacation_days]);

  // Fix: Parse holiday dates correctly using UTC
  const parseHolidayDate = (dateString: string) => {
    // Ensure input is a string before parsing
    const dt = DateTime.fromISO(String(dateString), { zone: 'utc' });
    if (!dt.isValid) {
      console.warn(
        `[parseHolidayDate] Invalid date encountered: ${dateString}`,
      );
      // Return a clearly invalid date or handle as needed
      return DateTime.invalid('Invalid date provided');
    }
    return dt;
  };

  // Get upcoming holidays (next 3)
  const upcomingHolidays = holidays
    .map((holiday) => ({
      ...holiday,
      // Pre-parse dates for filtering/sorting, handle potential invalid dates
      parsedDate: parseHolidayDate(holiday.date),
    }))
    .filter(
      (holiday) =>
        holiday.parsedDate.isValid &&
        holiday.parsedDate >= DateTime.now().startOf('day'),
    )
    .sort((a, b) => a.parsedDate.toMillis() - b.parsedDate.toMillis())
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
                  holiday.parsedDate.isValid && (
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
                          {holiday.parsedDate.toFormat('M/d/yyyy')}
                        </Typography>
                      </Box>
                      <Chip
                        label={holiday.type === 'bank' ? 'Bank' : 'Prov'}
                        color={
                          holiday.type === 'bank' ? 'warning' : 'secondary'
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
