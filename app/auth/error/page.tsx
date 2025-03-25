'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  
  let errorMessage = 'An error occurred during authentication.';
  
  switch (error) {
    case 'Signin':
      errorMessage = 'Try signing in with a different account.';
      break;
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'EmailCreateAccount':
    case 'Callback':
      errorMessage = 'There was a problem with the OAuth authentication.';
      break;
    case 'OAuthAccountNotLinked':
      errorMessage = 'The email is already used with another account.';
      break;
    case 'SessionRequired':
      errorMessage = 'Please sign in to access this page.';
      break;
    default:
      errorMessage = 'An unknown error occurred.';
      break;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h1>
          <p className="mt-4 text-center text-red-600">{errorMessage}</p>
        </div>
        <div className="flex justify-center">
          <Link
            href="/auth/signin"
            className="btn-primary"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
} 