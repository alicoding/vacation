'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/dist/client/app-dir/link';
import { 
  Box, List, ListItem, ListItemIcon, ListItemText, ListItemButton, 
  Typography, Divider, IconButton, Paper, Stack, Collapse, Drawer
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ChevronDoubleLeftIcon from '@heroicons/react/24/outline/ChevronDoubleLeftIcon';
import ChevronDoubleRightIcon from '@heroicons/react/24/outline/ChevronDoubleRightIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import MiniCalendar from './MiniCalendar';
import { Holiday, VacationBooking } from '@/types';

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
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & {
    title?: string;
    titleId?: string;
  }>;
}

export default function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [vacations, setVacations] = useState<VacationBooking[]>([]);
  const [vacationStats, setVacationStats] = useState({
    used: 0,
    booked: 0,
    remaining: 0
  });

  // Navigation links for the sidebar - properly typed
  const navLinks: NavLink[] = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Vacations', href: '/dashboard/vacations', icon: CalendarIcon },
    { name: 'Settings', href: '/dashboard/settings', icon: CogIcon },
  ];

  // Function to determine if a nav link is active
  const isActive = (path: string): boolean => pathname === path || 
    (path !== '/dashboard' && (pathname || '').startsWith(path));

  // Get properly typed user
  const user = session?.user as ExtendedUser | undefined;

  // Fetch holidays and vacation data
  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      
      try {
        // Fetch holidays
        const holidaysResponse = await fetch('/api/holidays');
        if (holidaysResponse.ok) {
          const holidaysData = await holidaysResponse.json();
          setHolidays(holidaysData);
        }
        
        // Fetch vacation bookings
        const vacationsResponse = await fetch('/api/vacations');
        if (vacationsResponse.ok) {
          const vacationsData = await vacationsResponse.json();
          setVacations(vacationsData);
          
          // Calculate vacation stats
          if (user.total_vacation_days) {
            const totalDays = user.total_vacation_days;
            let bookedDays = 0;
            
            // Calculate total booked days
            vacationsData.forEach((vacation: VacationBooking) => {
              const startDate = new Date(vacation.start_date);
              const endDate = new Date(vacation.end_date);
              const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              bookedDays += diff;
            });
            
            setVacationStats({
              used: 0, // This would come from a more complex calculation
              booked: bookedDays,
              remaining: totalDays - bookedDays
            });
          }
        }
      } catch (error) {
        console.error('Error fetching sidebar data:', error);
      }
    }
    
    fetchData();
  }, [user?.id, user?.total_vacation_days]);

  // Get upcoming holidays (next 3)
  const upcomingHolidays = holidays
    .filter(holiday => new Date(holiday.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Create a wrapper component to handle HeroIcon with MUI props
  const IconWrapper = ({ 
    icon: Icon, 
    sx 
  }: { 
    icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>, 
    sx?: Record<string, unknown> 
  }) => {
    return <Icon style={{ height: sx?.height as string | number, width: sx?.width as string | number, marginRight: sx?.mr as string | number }} />;
  };

  return (
    <Paper 
      component={Box}
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        borderRight: 1,
        borderColor: 'divider'
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1}>
        <Box sx={{ display: collapsed ? 'none' : 'block' }}>
          {/* Logo or title would go here */}
          <Typography variant="h6">Vacation App</Typography>
        </Box>
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? 
            <ChevronDoubleRightIcon style={{ height: 20, width: 20 }} /> : 
            <ChevronDoubleLeftIcon style={{ height: 20, width: 20, color: 'rgba(0, 0, 0, 0.6)' }} />
          }
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
            width: collapsed ? 'auto' : 240
          }
        }}
      >
        <Box sx={{ p: 1 }}>
          <List>
            {navLinks.map(link => (
              <ListItem key={link.name} disablePadding>
                <ListItemButton 
                  component={Link}
                  href={link.href}
                  selected={isActive(link.href)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: isActive(link.href) ? 'action.selected' : 'transparent'
                  }}
                >
                  <ListItemIcon sx={{ minWidth: collapsed ? 'auto' : 40 }}>
                    <IconWrapper 
                      icon={link.icon} 
                      sx={{ height: 20, width: 20, mr: collapsed ? 0 : 1 }}
                    />
                  </ListItemIcon>
                  {!collapsed && (
                    <ListItemText primary={link.name} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {!collapsed && user?.total_vacation_days && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Your vacation days
          </Typography>
          
          <Stack spacing={1}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Total:
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="primary.main">
                {user.total_vacation_days} days
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Booked:
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="warning.main">
                {vacationStats.booked} days
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Remaining:
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="success.main">
                {vacationStats.remaining} days
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      {!collapsed && upcomingHolidays && (
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Upcoming Holidays
          </Typography>
          
          {upcomingHolidays.length > 0 ? (
            <List dense disablePadding>
              {upcomingHolidays.map(holiday => (
                <ListItem key={holiday.id} sx={{ py: 0.5, px: 0 }}>
                  <ListItemText 
                    primary={holiday.name}
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(holiday.date).toLocaleDateString()}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No upcoming holidays
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}