import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      total_vacation_days: number;
      province: string;
    } & DefaultSession["user"];
  }
  
  interface User {
    total_vacation_days: number;
    province: string;
  }
} 