/**
 * Base API client service for handling requests to backend services
 */

import { getAuthToken } from './auth-service';

// Define API error structure
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// API response type
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

// Base API client configuration
interface ApiClientConfig {
  baseUrl?: string;
  requiresAuth?: boolean;
}

// Default configuration using environment variables
const defaultConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_FUNCTION_APP_URL || 'http://localhost:7071',
  requiresAuth: true,
};

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  config: ApiClientConfig = defaultConfig
): Promise<ApiResponse<T>> {
  try {
    const { baseUrl, requiresAuth } = { ...defaultConfig, ...config };
    const url = `${baseUrl}${endpoint}`;
    
    // Clone the headers to avoid modification issues
    const headers = new Headers(options.headers || {});
    
    // Add content type if not present and not a GET request
    if (!headers.has('Content-Type') && options.method !== 'GET' && options.body) {
      headers.append('Content-Type', 'application/json');
    }
    
    // Add authentication if required
    if (requiresAuth) {
      const authToken = await getAuthToken();
      if (authToken) {
        headers.append('Authorization', `Bearer ${authToken}`);
      } else {
        console.warn('No auth token available for authenticated request');
        // In production, you might want to redirect to login here
      }
    }
    
    // Prepare the request
    const requestOptions: RequestInit = {
      ...options,
      headers,
    };
    
    // Execute the request
    const response = await fetch(url, requestOptions);
    
    // Parse JSON response if available
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    // Handle API errors
    if (!response.ok) {
      return {
        success: false,
        error: {
          message: data.message || 'An error occurred',
          status: response.status,
          code: data.code || 'UNKNOWN_ERROR',
        },
      };
    }
    
    // Return successful response
    return {
      success: true,
      data,
    };
    
  } catch (error) {
    console.error('API request failed:', error);
    
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'NETWORK_ERROR',
      },
    };
  }
}
