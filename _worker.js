// Custom Cloudflare Worker for Next.js routing
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

    // Check if this is an API route
    if (url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    // For all other routes, try to fetch the specific route first
    let response = await env.ASSETS.fetch(request);
    
    // If not found (404), serve the index.html for client-side routing
    if (response.status === 404) {
      const indexRequest = new Request(`${url.origin}/index.html`, request);
      response = await env.ASSETS.fetch(indexRequest);
    }
    
    return response;
  }
}