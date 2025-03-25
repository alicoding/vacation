/**
 * @file Defines the NextAuth configuration and handler.
 * This file sets up authentication using NextAuth.js, integrating with Google OAuth and Prisma for database interactions.
 * It configures session management, user data retrieval, and customizes the authentication flow.
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 