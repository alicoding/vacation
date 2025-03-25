import type { CredentialInput } from "next-auth/providers/credentials";
import { jwtDecode } from 'jwt-decode';

interface GoogleOneTapProfile {
  aud: string;
  azp: string;
  email: string;
  email_verified: boolean;
  exp: number;
  family_name: string;
  given_name: string;
  iat: number;
  iss: string;
  jti: string;
  name: string;
  nbf: number;
  picture: string;
  sub: string;
}

interface CredentialsInput {
  credential?: string;
}

export default function GoogleOneTapProvider() {
  return {
    id: "google-one-tap",
    name: "Google One Tap",
    type: "credentials" as const,
    credentials: {
      credential: { type: "text" }
    },
    async authorize(credentials: CredentialsInput | undefined) {
      console.log("GoogleOneTapProvider: authorize called");
      
      try {
        if (!credentials?.credential) {
          console.error("GoogleOneTapProvider: No credential provided");
          throw new Error("No credential provided");
        }
        
        console.log("GoogleOneTapProvider: Decoding credential JWT");
        // Decode the JWT token from Google
        const profile = jwtDecode<GoogleOneTapProfile>(credentials.credential);
        
        // Log profile info (remove in production!)
        console.log("GoogleOneTapProvider: Profile decoded", {
          sub: profile.sub,
          email: profile.email,
          name: profile.name,
          aud: profile.aud
        });
        
        // Verify the token's audience matches our client ID
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (profile.aud !== clientId) {
          console.error("GoogleOneTapProvider: Invalid token audience", {
            expected: clientId,
            received: profile.aud
          });
          throw new Error("Invalid token audience");
        }
        
        // Check if the user already exists in the database
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        try {
          let user = await prisma.user.findUnique({
            where: { email: profile.email }
          });
          
          if (!user) {
            console.log("GoogleOneTapProvider: Creating new user", profile.email);
            // Create a new user if they don't exist
            user = await prisma.user.create({
              data: {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
                total_vacation_days: 14,
                province: 'ON',
                employment_type: 'standard',
                week_starts_on: 'sunday'
              }
            });
          } else {
            console.log("GoogleOneTapProvider: User found in database", user.id);
          }
          
          // Close Prisma connection
          await prisma.$disconnect();
          
          console.log("GoogleOneTapProvider: Returning user profile");
          // Return the user profile for authentication
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: profile.picture,
            total_vacation_days: user.total_vacation_days,
            province: user.province,
            employment_type: user.employment_type || 'standard',
            week_starts_on: user.week_starts_on || 'sunday'
          };
        } catch (dbError) {
          console.error("GoogleOneTapProvider: Database error", dbError);
          await prisma.$disconnect();
          
          // Fallback to just returning the profile from the JWT
          return {
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
            total_vacation_days: 14,
            province: 'ON',
            employment_type: 'standard',
            week_starts_on: 'sunday'
          };
        }
      } catch (error) {
        console.error("GoogleOneTapProvider: Authorization error", error);
        return null;
      }
    }
  };
} 