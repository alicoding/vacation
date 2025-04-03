// Custom Cloudflare Worker for edge-compatible routing
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle static assets directly
    if (
      url.pathname.startsWith('/_next/') ||
      url.pathname.startsWith('/static/') ||
      url.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|json)$/)
    ) {
      return env.ASSETS.fetch(request);
    }

    // For API routes, pass through to the Functions handler
    if (url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      // Try to fetch the specific route first
      const response = await env.ASSETS.fetch(request);
      
      // If successful, return the response
      if (response.status === 200) {
        return response;
      }
      
      // For 404s, try to serve the index HTML if it's a route that should be handled by client-side routing
      if (response.status === 404) {
        // Check if this looks like a route that should be handled by the app
        if (!url.pathname.match(/\.\w+$/)) {
          // Fetch the index HTML
          const indexUrl = new URL('/', url);
          const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
          
          // Return the index HTML with a 200 status
          return new Response(indexResponse.body, {
            status: 200,
            headers: indexResponse.headers
          });
        }
      }
      
      return response;
    } catch (error) {
      // If anything goes wrong, return a 500 error
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}