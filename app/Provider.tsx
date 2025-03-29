'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';

export default function Provider({ 
  children,
}: { 
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}