import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      total_vacation_days: number;
      province: string;
      employment_type: string;
      week_starts_on: string;
    } & DefaultSession["user"];
  }
  
  interface User {
    total_vacation_days: number;
    province: string;
    employment_type: string;
    week_starts_on: string;
  }
} 