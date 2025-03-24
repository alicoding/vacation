'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

// Navigation items
const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Book Vacation', href: '/dashboard/book' },
  { name: 'Calendar', href: '/dashboard/calendar' },
  { name: 'Settings', href: '/dashboard/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
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
            {session.user.total_vacation_days}
          </span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-sm font-medium text-gray-500">Available:</span>
          <span className="text-sm font-semibold text-vacation-booked">
            {/* This will be calculated dynamically */}
            {session.user.total_vacation_days} days
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
      
      {/* Mini Calendar will be added by another agent */}
    </aside>
  );
} 