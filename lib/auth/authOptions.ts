import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
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
    CredentialsProvider(GoogleOneTapProvider()),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
        };
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token?.sub || user?.id;
        if (token?.accessToken) {
          (session as any).accessToken = token.accessToken;
        }
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
            const fullUser = await prisma.user.findUnique({
              where: { id: session.user.id },
            });
            if (fullUser) {
              session.user.employment_type = (fullUser as any).employment_type || 'standard';
              session.user.week_starts_on = (fullUser as any).week_starts_on || 'sunday';
            }
          }
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
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
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}; 