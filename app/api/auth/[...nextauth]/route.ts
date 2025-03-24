
/**
 * @file Defines the NextAuth configuration and handler.
 * This file sets up authentication using NextAuth.js, integrating with Google OAuth and Prisma for database interactions.
 * It configures session management, user data retrieval, and customizes the authentication flow.
 */
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        // When using JWT strategy, use token.sub as the user ID
        session.user.id = token?.sub || user?.id;
        
        // Fetch additional user data from database if we have a user ID
        if (session.user.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
              total_vacation_days: true,
              province: true,
            },
          });
          
          if (dbUser) {
            session.user.total_vacation_days = dbUser.total_vacation_days;
            session.user.province = dbUser.province;
          }
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects more explicitly
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
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