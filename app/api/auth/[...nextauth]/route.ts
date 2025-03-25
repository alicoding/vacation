/**
 * @file Defines the NextAuth configuration and handler.
 * This file sets up authentication using NextAuth.js, integrating with Google OAuth and Prisma for database interactions.
 * It configures session management, user data retrieval, and customizes the authentication flow.
 */
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";
import GoogleOneTapProvider from "@/lib/auth/googleOneTapProvider";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    // Add Google One Tap provider as a credentials provider
    CredentialsProvider(GoogleOneTapProvider()),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        console.log("NextAuth: Setting up JWT token with user data");
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
        };
      }
      
      return token;
    },
    async session({ session, token, user }) {
      console.log("NextAuth: Setting up session", { tokenSub: token?.sub, userId: user?.id });
      
      if (session.user) {
        // When using JWT strategy, use token.sub as the user ID
        session.user.id = token?.sub || user?.id;
        
        if (token?.accessToken) {
          (session as any).accessToken = token.accessToken;
        }
        
        // Fetch additional user data from database if we have a user ID
        if (session.user.id) {
          // Only select fields that are part of the Prisma schema
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              total_vacation_days: true,
              province: true,
            },
          });
          
          if (dbUser) {
            console.log("NextAuth: Found user in database", { id: session.user.id });
            // Copy the fields we selected from the database
            session.user.total_vacation_days = dbUser.total_vacation_days;
            session.user.province = dbUser.province;
            
            // Get the full user record to access the custom fields
            const fullUser = await prisma.user.findUnique({
              where: { id: session.user.id },
            });
            
            if (fullUser) {
              // These fields are defined in the next-auth.d.ts file but we need to use any type
              // since they're not part of the default Prisma type
              session.user.employment_type = (fullUser as any).employment_type || 'standard';
              session.user.week_starts_on = (fullUser as any).week_starts_on || 'sunday';
            }
          } else {
            console.log("NextAuth: User not found in database", { id: session.user.id });
          }
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("NextAuth: Redirect callback", { url, baseUrl });
      // Handle redirects more explicitly
      if (url.startsWith("/")) {
        const fullUrl = `${baseUrl}${url}`;
        console.log("NextAuth: Redirecting to", fullUrl);
        return fullUrl;
      } else if (new URL(url).origin === baseUrl) {
        console.log("NextAuth: Redirecting to", url);
        return url;
      }
      console.log("NextAuth: Fallback redirect to", baseUrl);
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production", // Only use secure in production
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 