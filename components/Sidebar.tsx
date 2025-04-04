'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth-helpers.client';
import { Box, Typography, List, ListItem, ListItemText, Divider, CircularProgress } from '@mui/material';
import useHolidays from '@/lib/hooks/useHolidays';
import { DateTime } from 'luxon';

// Navigation items
const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Request Vacation', href: '/dashboard/vacations' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Settings', href: '/dashboard/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  
  // Get current year for holiday fetching
  const currentYear = new Date().getFullYear();
  const province = (session?.user as any)?.province || 'ON';
  
  // Use our useHolidays hook to fetch holidays
  const { 
    holidays: allHolidays, 
    loading: holidaysLoading, 
    error: holidaysError, 
  } = useHolidays(currentYear, province);
  
  // Filter to only show upcoming holidays
  useEffect(() => {
    if (allHolidays && allHolidays.length > 0) {
      const today = DateTime.now().startOf('day');
      
      // Filter holidays that are today or in the future
      const upcoming = allHolidays
        .map((holiday) => {
          const holidayDate = typeof holiday.date === 'string'
            ? DateTime.fromISO(holiday.date)
            : DateTime.fromJSDate(holiday.date as Date);
          
          return {
            ...holiday,
            luxonDate: holidayDate,
          };
        })
        .filter((holiday) => holiday.luxonDate >= today)
        .sort((a, b) => a.luxonDate.toMillis() - b.luxonDate.toMillis())
        .slice(0, 3); // Only show next 3 holidays
      
      setUpcomingHolidays(upcoming);
    }
  }, [allHolidays]);
  
  if (!session) {
    return null;
  }

  return (
    <aside className="w-full md:w-64 bg-white shadow-md md:h-[calc(100vh-4rem)]">
      <div className="p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname?.startsWith(item.href));
              
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md 
                  ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}
                `}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Vacation Summary */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Vacation Summary
        </h3>
        <div className="mt-2 flex justify-between">
          <span className="text-sm font-medium text-gray-500">Total Days:</span>
          <span className="text-sm font-semibold text-gray-900">
            {(session.user as any).total_vacation_days || 0}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-sm font-medium text-gray-500">Available:</span>
          <span className="text-sm font-semibold text-vacation-booked">
            {/* This will be calculated dynamically */}
            {(session.user as any).total_vacation_days || 0} days
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-sm font-medium text-gray-500">Booked:</span>
          <span className="text-sm font-semibold text-vacation-holiday">
            {/* This will be calculated dynamically */}
            0 days
          </span>
        </div>
      </div>
      
      {/* Upcoming Holidays List */}
      <div className="border-t border-gray-200 p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Upcoming Holidays
        </h3>
        
        {holidaysLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : holidaysError ? (
          <Typography variant="body2" color="error" sx={{ fontSize: '0.875rem' }}>
            Could not load holidays
          </Typography>
        ) : upcomingHolidays.length === 0 ? (
          <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            No upcoming holidays
          </Typography>
        ) : (
          <List dense disablePadding>
            {upcomingHolidays.map((holiday, index) => (
              <ListItem key={index} disableGutters sx={{ px: 0, py: 0.5 }}>
                <ListItemText
                  primary={holiday.name}
                  secondary={holiday.luxonDate.toLocaleString({ 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                  })}
                  primaryTypographyProps={{ 
                    variant: 'body2',
                    sx: { fontWeight: 'medium', fontSize: '0.875rem' },
                  }}
                  secondaryTypographyProps={{ 
                    variant: 'caption',
                    sx: { fontSize: '0.75rem' }, 
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </div>
    </aside>
  );
}