// types/global.d.ts

// Define the structure of the environment variables object
interface EnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
}

// Augment the global Window interface
declare global {
  interface Window {
    // Make it optional (?) as it's assigned dynamically
    __ENV__?: EnvVars;
  }
}

// Add an empty export statement to ensure this file is treated as a module.
// This is necessary for global augmentations in some TypeScript configurations.
export {};