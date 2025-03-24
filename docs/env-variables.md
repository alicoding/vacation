# Environment Variables Documentation

This document describes all environment variables required for the Vacation Tracker application.

## Authentication Variables

### NEXTAUTH_URL
- **Description**: The base URL of your application, used by NextAuth.js for callback URLs and absolute links.
- **Required**: Yes
- **Example**: `https://vacation.share.zrok.io` or `http://localhost:3000` (for local development)

### NEXTAUTH_SECRET
- **Description**: A secret string used to encrypt JWTs and session cookies. Should be at least 32 characters long and randomly generated.
- **Required**: Yes
- **Example**: `s3cr3t_k3y_g3n3r4t3_r4nd0mly_f0r_s3cur1ty`
- **Generation**: For production, generate a secure random string. For development, you can use any string.
  ```
  openssl rand -base64 32
  ```

## OAuth Provider Variables

### GOOGLE_CLIENT_ID
- **Description**: The Client ID from your Google Cloud Console project OAuth credentials.
- **Required**: Yes for Google authentication
- **Source**: [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials

### GOOGLE_CLIENT_SECRET
- **Description**: The Client Secret from your Google Cloud Console project OAuth credentials.
- **Required**: Yes for Google authentication
- **Source**: [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials

## Database Variables

### DATABASE_URL
- **Description**: PostgreSQL connection string for Prisma ORM to connect to the database.
- **Required**: Yes
- **Format**: `postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA`
- **Example**: `postgresql://postgres:postgres@localhost:5432/vacation_tracker?schema=public`

## Configuration Requirements

### Google OAuth Configuration

When setting up Google OAuth, ensure your authorized redirect URIs include:
- `{NEXTAUTH_URL}/api/auth/callback/google`

For example, if your NEXTAUTH_URL is `https://vacation.share.zrok.io`, the redirect URI should be:
- `https://vacation.share.zrok.io/api/auth/callback/google`

### Local Development

For local development, you can use:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=any_secret_key_for_development
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vacation_tracker?schema=public
```

### Production Deployment

For production deployment on Render.com:
1. Set all environment variables in the Render.com dashboard
2. Ensure NEXTAUTH_URL matches your deployed URL
3. Generate a secure NEXTAUTH_SECRET
4. Set up PostgreSQL connection string for the production database

## Troubleshooting

- **Authentication Issues**: If authentication redirects are not working, verify that NEXTAUTH_URL is correctly set and matches the authorized redirect URIs in Google Cloud Console.
- **Database Connection Issues**: Ensure the DATABASE_URL is correct and the database server is accessible from your application server.
- **NextAuth Errors**: Check that all required NextAuth variables are set and valid. 