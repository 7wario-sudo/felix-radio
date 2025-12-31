'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

// Check if we're in mock mode
const USE_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

/**
 * API Authentication Provider
 *
 * Injects Clerk authentication token into the API client.
 * This provider must wrap the app to enable authenticated API requests.
 *
 * In mock mode (NEXT_PUBLIC_USE_MOCK_API=true), this provider does nothing.
 * In production mode, it injects Clerk's getToken function into the API client.
 */
export function ApiAuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [isReady, setIsReady] = useState(USE_MOCK_MODE); // Mock mode is immediately ready

  useEffect(() => {
    // Skip auth setup in mock mode
    if (USE_MOCK_MODE) {
      console.log('API client running in mock mode');
      return;
    }

    // Wait for Clerk to be loaded
    if (!isLoaded) {
      return;
    }

    // Inject Clerk's getToken function into the API client
    // This allows the API client to fetch JWT tokens on-demand for each request
    apiClient.setTokenGetter(getToken);
    console.log('API client configured with Clerk authentication');
    setIsReady(true);
  }, [getToken, isLoaded]);

  // Don't render children until API client is configured
  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
