'use client'

import { useEffect, useRef } from 'react';
import { refreshAccessToken } from '@/lib/token-refresh';

/**
 * Hook to automatically refresh Google Calendar access token in the background
 * Prevents users from seeing "Token expired" errors
 */
export function useTokenRefresh() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Function to check and refresh token
    const checkAndRefreshToken = async () => {
      // Prevent multiple simultaneous refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      try {
        const accessToken = localStorage.getItem('google_calendar_token');
        const refreshToken = localStorage.getItem('google_calendar_refresh_token');

        // If no tokens, nothing to refresh
        if (!accessToken || !refreshToken) {
          return;
        }

        // Check if token is expired or about to expire (within 5 minutes)
        try {
          const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
          
          if (response.ok) {
            const tokenInfo = await response.json();
            const expiresIn = tokenInfo.expires_in || 3600; // Default to 1 hour if not provided
            
            // If token expires in less than 5 minutes, refresh it proactively
            if (expiresIn < 300) {
              console.log('[TokenRefresh] Token expires soon, refreshing proactively...');
              isRefreshingRef.current = true;
              
              const newToken = await refreshAccessToken(refreshToken);
              
              if (newToken) {
                localStorage.setItem('google_calendar_token', newToken);
                console.log('[TokenRefresh] ✅ Token refreshed successfully in background');
              } else {
                console.warn('[TokenRefresh] ⚠️ Token refresh failed, but will retry later');
              }
              
              isRefreshingRef.current = false;
            } else {
              // Token is still valid, log remaining time for debugging
              const minutesRemaining = Math.floor(expiresIn / 60);
              console.log(`[TokenRefresh] Token valid for ${minutesRemaining} more minutes`);
            }
          } else {
            // Token is invalid/expired, try to refresh
            console.log('[TokenRefresh] Token invalid, attempting refresh...');
            isRefreshingRef.current = true;
            
            const newToken = await refreshAccessToken(refreshToken);
            
            if (newToken) {
              localStorage.setItem('google_calendar_token', newToken);
              console.log('[TokenRefresh] ✅ Token refreshed successfully in background');
            } else {
              console.warn('[TokenRefresh] ⚠️ Token refresh failed');
            }
            
            isRefreshingRef.current = false;
          }
        } catch (error) {
          // Network error or other issue - will retry on next check
          console.warn('[TokenRefresh] Error checking token:', error);
          isRefreshingRef.current = false;
        }
      } catch (error) {
        console.error('[TokenRefresh] Error in token refresh check:', error);
        isRefreshingRef.current = false;
      }
    };

    // Check immediately on mount
    checkAndRefreshToken();

    // Then check every 10 minutes (600000 ms)
    // This ensures we catch tokens before they expire (tokens typically last 1 hour)
    intervalRef.current = setInterval(checkAndRefreshToken, 10 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Only run once on mount
}

