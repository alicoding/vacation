'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GoogleOneTap = ({ onSuccess, onError }: GoogleOneTapProps) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load the Google Identity Services script
  useEffect(() => {
    console.log("GoogleOneTap: Initializing component");
    
    // Check if script is already loaded
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      console.log("GoogleOneTap: Script already loaded");
      setScriptLoaded(true);
      return;
    }

    // Add the script to the document
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("GoogleOneTap: Script loaded successfully");
      setScriptLoaded(true);
    };
    script.onerror = (error) => {
      console.error("GoogleOneTap: Script failed to load", error);
      onError?.("Failed to load Google Identity Services");
    };
    
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (window.google?.accounts?.id) {
        console.log("GoogleOneTap: Canceling on unmount");
        window.google.accounts.id.cancel();
      }
    };
  }, [onError]);

  // Initialize and display One Tap once the script is loaded
  useEffect(() => {
    if (!scriptLoaded || !window.google?.accounts?.id) {
      return;
    }

    console.log("GoogleOneTap: Initializing Google One Tap");

    // Callback function for handling the credential response
    const handleCredentialResponse = async (response: any) => {
      console.log("GoogleOneTap: Received credential response");
      
      try {
        // Use the google-one-tap provider instead of the standard google provider
        // This prevents the account selection screen
        const result = await signIn('google-one-tap', {
          credential: response.credential,
          redirect: false,
          callbackUrl: '/dashboard',
        });

        if (result?.error) {
          console.error("GoogleOneTap: Authentication error", result.error);
          onError?.(result.error);
        } else if (result?.ok) {
          console.log("GoogleOneTap: Authentication successful, redirecting to", result.url);
          onSuccess?.();
          // Use hard redirect to ensure session is properly maintained
          window.location.href = result.url || '/dashboard';
        }
      } catch (error) {
        console.error("GoogleOneTap: Error processing credentials", error);
        onError?.('Failed to authenticate. Please try again.');
      }
    };

    // Initialize Google One Tap
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: true,
      cancel_on_tap_outside: false,
    });

    // Display the One Tap prompt
    console.log("GoogleOneTap: Displaying prompt");
    window.google.accounts.id.prompt();
    
  }, [scriptLoaded, onSuccess, onError]);

  return null; // This component doesn't render anything
};

export default GoogleOneTap; 