import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  // Redirect to dashboard if logged in, or signin if not
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/auth/signin');
  }
  
  // This won't be rendered, but included for completeness
  return null;
} 