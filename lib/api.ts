/**
 * Enhanced fetch function that handles zrok interstitial bypassing
 */
export async function fetchWithZrok(url: string, options: RequestInit = {}): Promise<Response> {
  // Create default headers if not provided
  if (!options.headers) {
    options.headers = {};
  }
  
  // Add the skip_zrok_interstitial header to bypass the interstitial page
  const headers = new Headers(options.headers as HeadersInit);
  headers.set('skip_zrok_interstitial', 'true');
  
  // Merge the headers back into the options
  options.headers = headers;
  
  // Perform the fetch
  return fetch(url, options);
}

/**
 * Function to handle API requests with proper error handling
 */
export async function apiRequest<T>(
  url: string, 
  method: string = 'GET', 
  data?: any
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetchWithZrok(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'An error occurred while fetching data');
  }
  
  return response.json();
} 