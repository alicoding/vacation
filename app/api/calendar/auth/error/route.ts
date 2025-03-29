export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Error handler for Google Calendar authorization issues
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const errorMessage = requestUrl.searchParams.get('message') || 'Unknown Google Calendar authorization error';
  
  // Log the error for server-side debugging
  console.error('Google Calendar Authorization Error:', errorMessage);
  
  // Return a user-friendly error page
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Google Calendar Authorization Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        .error-container {
          background-color: #f8f9fa;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 2rem;
        }
        h1 {
          color: #e53e3e;
          margin-top: 0;
        }
        .action-buttons {
          margin-top: 2rem;
        }
        .btn {
          display: inline-block;
          padding: 0.5rem 1rem;
          background-color: #3182ce;
          color: white;
          border-radius: 4px;
          text-decoration: none;
          margin-right: 1rem;
        }
        .error-details {
          margin-top: 2rem;
          padding: 1rem;
          background-color: #edf2f7;
          border-radius: 4px;
          font-family: monospace;
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Google Calendar Authorization Error</h1>
        <p>There was a problem with Google Calendar authorization. This is likely due to a configuration issue.</p>
        <p>Error details: <strong>${errorMessage}</strong></p>
        
        <div class="action-buttons">
          <a href="/dashboard/settings" class="btn">Return to Settings</a>
          <a href="/dashboard" class="btn">Go to Dashboard</a>
        </div>
        
        <div class="error-details">
          <h3>Developer Information</h3>
          <p>Please check the following:</p>
          <ul>
            <li>GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are properly set</li>
            <li>The redirect URI is configured in the Google Developer Console</li>
            <li>The application has the necessary Google Calendar API scopes enabled</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    },
  );
}