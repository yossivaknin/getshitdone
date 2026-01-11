'use client'

import { useState, useEffect } from 'react';
import { saveGoogleCalendarTokens, getGoogleCalendarTokens, logout } from '@/app/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, XCircle, Loader2, Search, ArrowLeft, X, Keyboard } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { testCalendarAPI } from '@/app/test-calendar';
import { listCalendarEvents } from '@/app/debug-calendar';
import { TagManager } from '@/components/tag-manager';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<{ title: string, message: string, link?: string } | null>(null);
  const [workingHoursStart, setWorkingHoursStart] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('working_hours_start') || '09:00';
    }
    return '09:00';
  });
  const [workingHoursEnd, setWorkingHoursEnd] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('working_hours_end') || '18:00';
    }
    return '18:00';
  });
  const [userTimezone, setUserTimezone] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    }
    return 'America/New_York';
  });
  const [createTaskShortcut, setCreateTaskShortcut] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('create_task_shortcut') || 'n';
    }
    return 'n';
  });
  const [redirectUri, setRedirectUri] = useState('');

  // Check connection status on mount and handle OAuth callback
  useEffect(() => {
    // Set redirect URI on client side only
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    setRedirectUri(`${baseUrl}/api/auth/google/callback`);

    // Check URL params for OAuth callback (works for both web and Capacitor)
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const token = urlParams.get('token');
    const refresh = urlParams.get('refresh');

    // Wrap async code in an async IIFE
    (async () => {
      if (connected === 'true' && token) {
      console.log('[Settings] OAuth callback received:', {
        hasToken: !!token,
        hasRefresh: !!refresh,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        tokenStartsWith: token.substring(0, 5)
      });
      
      // CRITICAL: Reset loading state IMMEDIATELY when we detect OAuth success
      setIsLoading(false);
      sessionStorage.removeItem('oauth_in_progress');
      // Clear timeout if it exists
      const timeoutId = sessionStorage.getItem('oauth_timeout_id');
      if (timeoutId) {
        clearTimeout(parseInt(timeoutId));
        sessionStorage.removeItem('oauth_timeout_id');
      }
      
      // Validate token format - access tokens usually start with 'ya29.' or similar
      // Refresh tokens start with '1//'
      if (token.startsWith('1//')) {
        console.error('[Settings] ❌ ERROR: Received refresh token as access token!');
        console.error('[Settings] This means the OAuth response had tokens swapped or missing access_token');
        toast.error('OAuth error: Received refresh token instead of access token. Please try again.');
        // Clean URL
        window.history.replaceState({}, '', '/settings');
        return;
      }

      // Save to localStorage (for backward compatibility)
      localStorage.setItem('google_calendar_token', token);
      // CRITICAL: Also save to database so tokens are shared across devices
      console.log('[Settings] Saving tokens to database...');
      try {
        const expiresIn = urlParams.get('expires_in') ? parseInt(urlParams.get('expires_in')!) : undefined;
        const saveResult = await saveGoogleCalendarTokens(token, refresh || undefined, expiresIn);
        if (saveResult.success) {
          console.log('[Settings] ✅ Tokens saved to database successfully');
        } else {
          console.error('[Settings] ⚠️ Failed to save tokens to database:', saveResult.error);
        }
      } catch (error) {
        console.error('[Settings] ⚠️ Exception saving tokens to database:', error);
      }
      
      if (refresh) {
        localStorage.setItem('google_calendar_refresh_token', refresh);
      }

      // Verify token was saved
      const savedToken = localStorage.getItem('google_calendar_token');
      if (savedToken === token) {
        console.log('[Settings] ✅ Token saved successfully');
        setIsConnected(true);
        setConnectionError(null);
        toast.success('Successfully connected to Google Calendar!');
      } else {
        console.error('[Settings] ❌ Token save failed!');
        console.error('[Settings] Expected:', token.substring(0, 20));
        console.error('[Settings] Got:', savedToken?.substring(0, 20));
        toast.error('Failed to save token. Please try again.');
      }

      // Clean URL - remove query params to prevent re-triggering
      window.history.replaceState({}, '', '/settings');
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      console.error('[Settings] OAuth error:', error);
      toast.error(`Connection failed: ${error}. Please try again.`);
      setIsLoading(false);
      sessionStorage.removeItem('oauth_in_progress');
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else {
      // No URL params, check if we have tokens in localStorage (for Capacitor deep link)
      const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
      if (isCapacitor) {
        const hasToken = localStorage.getItem('google_calendar_token');
        if (hasToken) {
          console.log('[Settings] Found token in localStorage, checking connection status');
          // Reset loading in case it was stuck
          setIsLoading(false);
        }
      }
    }

    })(); // Close async IIFE
    // Always check connection status on mount
    checkConnectionStatus();
    
    // Also check for tokens immediately on mount (in case they were saved while page was loading)
    const checkTokenOnMount = () => {
      const token = localStorage.getItem('google_calendar_token');
      const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
      if (token && oauthInProgress) {
        console.log('[Settings] Mount check: Found token, resetting loading');
        setIsLoading(false);
        sessionStorage.removeItem('oauth_in_progress');
        checkConnectionStatus();
      }
    };
    
    // Check immediately
    checkTokenOnMount();
    
    // Also check after a short delay (in case tokens are being saved asynchronously)
    setTimeout(checkTokenOnMount, 200);
    setTimeout(checkTokenOnMount, 500);
  }, []);
  // #region agent log - Mobile layout debugging
  useEffect(() => {
    const logLayoutInfo = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      
      fetch('http://127.0.0.1:7242/ingest/bbe2b18e-8946-4f9b-99f0-e0e7eda9850e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'settings/page.tsx:useEffect:layout',
          message: 'Viewport dimensions',
          data: { width, height, isMobile, userAgent: navigator.userAgent.substring(0, 50) },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A'
        })
      }).catch(() => {});
      
      // Check for overflow issues
      setTimeout(() => {
        const headerSection = document.querySelector('[data-settings-header]');
        const buttonGroup = document.querySelector('[data-settings-buttons]');
        if (headerSection) {
          const headerRect = headerSection.getBoundingClientRect();
          const headerOverflow = headerSection.scrollWidth > headerSection.clientWidth;
          fetch('http://127.0.0.1:7242/ingest/bbe2b18e-8946-4f9b-99f0-e0e7eda9850e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'settings/page.tsx:useEffect:header-overflow',
              message: 'Header section overflow check',
              data: { 
                width: headerRect.width, 
                scrollWidth: headerSection.scrollWidth,
                clientWidth: headerSection.clientWidth,
                hasOverflow: headerOverflow,
                isMobile
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'B'
            })
          }).catch(() => {});
        }
        if (buttonGroup) {
          const buttonRect = buttonGroup.getBoundingClientRect();
          const buttonOverflow = buttonGroup.scrollWidth > buttonGroup.clientWidth;
          fetch('http://127.0.0.1:7242/ingest/bbe2b18e-8946-4f9b-99f0-e0e7eda9850e', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'settings/page.tsx:useEffect:button-overflow',
              message: 'Button group overflow check',
              data: { 
                width: buttonRect.width, 
                scrollWidth: buttonGroup.scrollWidth,
                clientWidth: buttonGroup.clientWidth,
                hasOverflow: buttonOverflow,
                isMobile
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'D'
            })
          }).catch(() => {});
        }
      }, 500);
    };
    
    logLayoutInfo();
    window.addEventListener('resize', logLayoutInfo);
    return () => window.removeEventListener('resize', logLayoutInfo);
  }, []);
  // #endregion


  // Listen for storage changes and app visibility (for Capacitor deep link tokens)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'google_calendar_token' && e.newValue) {
        console.log('[Settings] Token detected in storage, checking connection');
        setIsLoading(false);
        checkConnectionStatus();
      }
    };

    // Listen for custom event from deep link handler
    const handleTokenSaved = () => {
      console.log('[Settings] Token saved event received, checking connection');
      // Reset loading immediately
      setIsLoading(false);
      // Clear OAuth in progress flag
      sessionStorage.removeItem('oauth_in_progress');
      // Check connection status
      checkConnectionStatus();
    };

    // Check for tokens when page becomes visible (user switched back from Safari)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Settings] Page became visible, checking for tokens');
        const token = localStorage.getItem('google_calendar_token');
        const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
        console.log('[Settings] Visibility check:', { hasToken: !!token, isLoading, oauthInProgress });
        if (token) {
          console.log('[Settings] Found token after returning from OAuth, resetting loading');
          setIsLoading(false);
          sessionStorage.removeItem('oauth_in_progress');
          checkConnectionStatus();
        } else if (oauthInProgress && isLoading) {
          // OAuth in progress but no token yet - check again in a moment
          console.log('[Settings] OAuth in progress, will check again...');
          setTimeout(() => {
            const tokenAfterDelay = localStorage.getItem('google_calendar_token');
            if (tokenAfterDelay) {
              console.log('[Settings] Found token after delay, resetting loading');
              setIsLoading(false);
              sessionStorage.removeItem('oauth_in_progress');
              checkConnectionStatus();
            }
          }, 500);
        }
      }
    };

    // Check for tokens when window gains focus
    const handleFocus = () => {
      console.log('[Settings] Window gained focus, checking for tokens');
      const token = localStorage.getItem('google_calendar_token');
      const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
      console.log('[Settings] Focus check:', { hasToken: !!token, isLoading, oauthInProgress });
      if (token) {
        console.log('[Settings] Found token after focus, resetting loading');
        setIsLoading(false);
        sessionStorage.removeItem('oauth_in_progress');
        checkConnectionStatus();
      } else if (oauthInProgress && isLoading) {
        // OAuth in progress but no token yet - check again in a moment
        console.log('[Settings] OAuth in progress, will check again...');
        setTimeout(() => {
          const tokenAfterDelay = localStorage.getItem('google_calendar_token');
          if (tokenAfterDelay) {
            console.log('[Settings] Found token after delay, resetting loading');
            setIsLoading(false);
            sessionStorage.removeItem('oauth_in_progress');
            checkConnectionStatus();
          }
        }, 500);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('googleCalendarTokenSaved', handleTokenSaved);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also check immediately in case tokens were already saved
    // And check if OAuth was in progress
    const oauthInProgress = sessionStorage.getItem('oauth_in_progress');
    const token = localStorage.getItem('google_calendar_token');
    
    // Check URL params first (they take priority)
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.get('connected') === 'true' || urlParams.get('error');
    
    // If we have a token and OAuth was in progress, reset loading immediately
    if (token && (oauthInProgress || isLoading)) {
      console.log('[Settings] Found token after OAuth, clearing flag and resetting loading');
      sessionStorage.removeItem('oauth_in_progress');
      setIsLoading(false);
      // Also check connection status to update UI
      setTimeout(() => checkConnectionStatus(), 100);
    }
    
    // If OAuth was in progress but no token and no OAuth params, keep loading
    // (user might still be in the OAuth flow)
    if (oauthInProgress && !token && !hasOAuthParams) {
      console.log('[Settings] OAuth in progress but no token yet, keeping loading state');
    }
    
    // If we have OAuth params but no token, reset loading (error case)
    if (hasOAuthParams && !token) {
      console.log('[Settings] OAuth params present but no token, resetting loading');
      setIsLoading(false);
      sessionStorage.removeItem('oauth_in_progress');
    }
    
    // Additional safety check: if loading is true but we have a token, reset it
    if (isLoading && token && !oauthInProgress) {
      console.log('[Settings] Loading is true but we have a token, resetting loading');
      setIsLoading(false);
      checkConnectionStatus();
    }

    // Periodic check to reset loading if tokens are detected (safety net)
    let checkCount = 0;
    const checkInterval = setInterval(() => {
      checkCount++;
      const currentToken = localStorage.getItem('google_calendar_token');
      const currentOAuthInProgress = sessionStorage.getItem('oauth_in_progress');
      
      if (currentToken && (currentOAuthInProgress || isLoading)) {
        console.log('[Settings] Periodic check: Found token, resetting loading');
        sessionStorage.removeItem('oauth_in_progress');
        setIsLoading(false);
        checkConnectionStatus();
        // Clear interval once we've reset loading
        clearInterval(checkInterval);
      } else if (currentOAuthInProgress && isLoading && !currentToken) {
        // OAuth in progress but no token - log for debugging (but not every time to reduce spam)
        if (checkCount % 10 === 0) { // Log every 5 seconds (10 * 500ms)
          console.log('[Settings] Periodic check: OAuth in progress, no token yet (check #' + checkCount + ')');
        }
        
        // After 30 seconds, give up and reset loading
        if (checkCount >= 60) { // 60 * 500ms = 30 seconds
          console.log('[Settings] Periodic check: OAuth timeout after 30s, resetting loading');
          setIsLoading(false);
          sessionStorage.removeItem('oauth_in_progress');
          setConnectionError({ 
            title: 'Connection Timeout', 
            message: 'OAuth flow timed out. Please try again.' 
          });
          clearInterval(checkInterval);
        }
      }
    }, 500); // Check every 500ms for faster response

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('googleCalendarTokenSaved', handleTokenSaved);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(checkInterval);
    };
  }, [isLoading]);

  const checkConnectionStatus = async () => {
    try {
      // First, check database for tokens (shared across devices)
      console.log('[Settings] Checking database for tokens...');
      const dbTokens = await getGoogleCalendarTokens();
      console.log('[Settings] Database tokens result:', {
        hasAccessToken: !!dbTokens.accessToken,
        hasRefreshToken: !!dbTokens.refreshToken,
        source: dbTokens.source,
        accessTokenLength: dbTokens.accessToken?.length || 0
      });
      
      // If tokens found in database, load them into localStorage
      if (dbTokens.accessToken && dbTokens.source === 'database') {
        console.log('[Settings] ✅ Found tokens in database, loading into localStorage');
        localStorage.setItem('google_calendar_token', dbTokens.accessToken);
        if (dbTokens.refreshToken) {
          localStorage.setItem('google_calendar_refresh_token', dbTokens.refreshToken);
        }
      } else if (dbTokens.accessToken && dbTokens.source === 'localStorage') {
        console.log('[Settings] Tokens found in localStorage only (not in database yet)');
      } else {
        console.log('[Settings] ⚠️ No tokens found in database or localStorage');
      }
      
      // Check if we have stored tokens (from database or localStorage)
      const token = localStorage.getItem('google_calendar_token');
      const refreshToken = localStorage.getItem('google_calendar_refresh_token');

      if (!token) {
        console.log('[Settings] ❌ No tokens found in database or localStorage');
        setIsConnected(false);
        setIsLoading(false);
        return;
      }
      
      console.log('[Settings] ✅ Found token, validating... (length:', token.length, ')');

      // Validate token by making a test API call      // Validate token by making a test API call
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);

        if (response.ok) {
          const data = await response.json();
          console.log('[Settings] Token is valid:', {
            expires_in: data.expires_in,
            scope: data.scope
          });
          setIsConnected(true);
          setIsLoading(false);
        } else {
          // Token is invalid, try to refresh if we have refresh token
          if (refreshToken) {
            console.log('[Settings] Token invalid, attempting refresh...');
            const { refreshAccessToken } = await import('@/lib/token-refresh');
            const newToken = await refreshAccessToken(refreshToken);

            if (newToken) {
              localStorage.setItem('google_calendar_token', newToken);
              setIsConnected(true);
              setIsLoading(false);
              console.log('[Settings] ✅ Token refreshed successfully');
            } else {
              console.error('[Settings] ❌ Token refresh failed');
              setIsConnected(false);
              setIsLoading(false);
            }
          } else {
            console.error('[Settings] ❌ Token invalid and no refresh token available');
            setIsConnected(false);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error('[Settings] Error validating token:', error);
        // If validation fails, still show as connected if token exists
        // (might be a network issue)
        setIsConnected(!!token);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setConnectionError(null);
    // Set OAuth in progress flag
    sessionStorage.setItem('oauth_in_progress', 'true');
    
    // Safety timeout: if OAuth takes more than 2 minutes, reset loading
    const oauthTimeout = setTimeout(() => {
      const stillInProgress = sessionStorage.getItem('oauth_in_progress');
      const hasToken = localStorage.getItem('google_calendar_token');
      if (stillInProgress && !hasToken) {
        console.log('[Settings] OAuth timeout - resetting loading state');
        setIsLoading(false);
        sessionStorage.removeItem('oauth_in_progress');
        setConnectionError({ 
          title: 'Connection Timeout', 
          message: 'OAuth flow took too long. Please try again.' 
        });
      }
    }, 120000); // 2 minutes
    
    // Store timeout ID to clear it if OAuth succeeds
    sessionStorage.setItem('oauth_timeout_id', oauthTimeout.toString());

    try {
      // Detect if we're running in Capacitor
      const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
      
      // Generate OAuth URL
      // Use iOS client ID for Capacitor, web client ID for browser
      const clientId = isCapacitor
        ? (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_IOS || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '')
        : (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID_WEB || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '');
      
      // For native iOS apps, use Google's reversed client ID format
      // For web apps, we must use HTTPS URLs
      let redirectUri: string;
      if (isCapacitor) {
        // For Capacitor (iOS native app), use Google's reversed client ID format
        // Format: com.googleusercontent.apps.CLIENT_ID:/oauth2redirect
        // Extract client ID from the full client ID string
        const clientIdParts = clientId.split('.apps.googleusercontent.com')[0];
        const reversedClientId = `com.googleusercontent.apps.${clientIdParts}`;
        redirectUri = `${reversedClientId}:/oauth2redirect`;
        
        // Alternative: You can also use your custom scheme: com.sitrep.app:/oauth2redirect
        // But Google's format is more standard
        // redirectUri = 'com.sitrep.app:/oauth2redirect';
      } else {
        // For web, use the configured URL or current origin
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        // For localhost, use HTTP. For production, use HTTPS (required for sensitive scopes)
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        const redirectUrl = isLocalhost 
          ? baseUrl  // Keep HTTP for localhost
          : (baseUrl.startsWith('https://') ? baseUrl : `https://${baseUrl.replace(/^https?:\/\//, '')}`);  // Force HTTPS for production
        redirectUri = `${redirectUrl}/api/auth/google/callback`;
      }
      
      // Log the exact configuration being used
      console.log('[OAuth] Is Capacitor:', isCapacitor);
      console.log('[OAuth] Client ID type:', isCapacitor ? 'iOS' : 'Web');
      console.log('[OAuth] Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET');
      console.log('[OAuth] Redirect URI:', redirectUri);
      console.log('[OAuth] Window origin:', window.location.origin);
      console.log('[OAuth] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

      const scope = 'https://www.googleapis.com/auth/calendar';
      const responseType = 'code';

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=${responseType}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      if (!clientId) {
        toast.error('Google Client ID not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env file.');
        setIsLoading(false);
        return;
      }

      // Show the redirect URI to user for debugging
      console.log('[OAuth Debug] Full auth URL:', authUrl);
      toast(`Connecting... Redirect URI: ${redirectUri}`, { duration: 5000 });

      // For Capacitor, redirect to OAuth URL
      // The redirect page will handle opening the app via custom URL scheme
      if (isCapacitor) {
        console.log('[OAuth] Opening OAuth in Safari (will redirect back to app)');
        // Set a flag so we know OAuth is in progress
        sessionStorage.setItem('oauth_in_progress', 'true');
        // Open in Safari - the callback page will redirect to the app
        window.location.href = authUrl;
      } else {
        // For web, redirect normally
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Error initiating OAuth:', error);
      toast.error('Failed to connect to Google Calendar. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_refresh_token');
    setIsConnected(false);
    setConnectionError(null);
    toast.success('Disconnected from Google Calendar');
  };

  const handleTestConnection = async () => {
    const accessToken = localStorage.getItem('google_calendar_token');
    const refreshToken = localStorage.getItem('google_calendar_refresh_token');

    if (!accessToken) {
      toast.error('Not connected to Google Calendar');
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    try {
      // Pass the Client ID from frontend to ensure validation works even if server env var is missing
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      const userTimezone = localStorage.getItem('user_timezone') || 'America/New_York';
      const result = await testCalendarAPI(accessToken, refreshToken || undefined, clientId, userTimezone);
      if (result.success) {
        toast.success(result.message + ` Created test event. Check your calendar!`);
        console.log('Test details:', result.details);
      } else {
        // Show detailed error message
        const errorMessage = result.details
          ? `${result.message}: ${result.details}`
          : result.message;
        toast.error(result.message, { duration: 6000 });
        console.error('[TEST] Test failed:', {
          message: result.message,
          details: result.details
        });

        // If it's a 404 error, show specific guidance
        if (result.details && typeof result.details === 'string' && result.details.includes('404')) {
          console.error('[TEST] ❌ 404 Error detected - Calendar API likely not enabled');
          setConnectionError({
            title: 'Calendar API Not Found',
            message: `The Calendar API returned a 404 error. This usually means:\n\n1. Calendar API is NOT enabled in your Google Cloud project\n2. Your token may not have the calendar scope\n3. There may be a billing/quota issue\n\nPlease check:\n- Enable Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com\n- Verify your token has calendar scope (try disconnecting and reconnecting)\n- Check billing status: https://console.cloud.google.com/billing`,
            link: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com'
          });
        // Note: We no longer check for "Token mismatch" since the token's Client ID doesn't need to match
        // the configured Client ID - if the token works, that's what matters
        } else {
          setConnectionError({
            title: 'Connection Test Failed',
            message: result.message || 'Unknown error occurred during test.',
          });
        }
      }
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error('Failed to test connection');
      setConnectionError({
        title: 'Test Error',
        message: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleListEvents = async () => {
    const accessToken = localStorage.getItem('google_calendar_token');

    if (!accessToken) {
      toast.error('Not connected to Google Calendar');
      return;
    }

    setIsLoading(true);
    try {
      const result = await listCalendarEvents(accessToken, 20);
      if (result.success) {
        console.log('[DEBUG] Found events:', result.events);
        if (result.events && result.events.length > 0) {
          toast.success(`Found ${result.events.length} event(s) with "[Focus]" in your calendar`);
          console.log('[DEBUG] Event details:', result.events);
          // Log each event with a clickable link
          result.events.forEach((event: any, index: number) => {
            console.log(`[DEBUG] Event ${index + 1}:`, {
              summary: event.summary,
              start: event.start,
              end: event.end,
              link: event.htmlLink
            });
          });
        } else {
          toast('No events found with "[Focus]" in the next 30 days', { icon: 'ℹ️' });
          console.log('[DEBUG] No events found. This could mean:');
          console.log('[DEBUG] 1. Events were not created successfully');
          console.log('[DEBUG] 2. Events are outside the 30-day window');
          console.log('[DEBUG] 3. Events are in a different calendar');
        }
      } else {
        toast.error(result.message);
        console.error('[DEBUG] Failed to list events:', result.message);
      }
    } catch (error) {
      console.error('[DEBUG] Error listing events:', error);
      toast.error('Failed to list events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] p-4 sm:p-6 md:p-8 safe-top" data-settings-container="true" style={{ paddingTop: `calc(2rem + env(safe-area-inset-top))` }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/app"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Mission Control
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">
          <form action={logout}>
            <button
              type="submit"
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </form>Configure your Google Calendar integration</p>
        </div>

        {/* Google Calendar Connection */}
        <div className="bg-[#1A1A1A] rounded-md border border-gray-800 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4" data-settings-header="true">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold text-white">Google Calendar</h2>
                <p className="text-sm text-gray-400">Connect your calendar for smart scheduling</p>
              </div>
            </div>
            {isConnected ? (
              <div className="flex flex-wrap items-center gap-2" data-settings-buttons="true">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-emerald-500">Connected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="ml-2 bg-[#1A1A1A] border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleListEvents}
                  disabled={isLoading}
                  className="ml-2 bg-[#1A1A1A] border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      List Events
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="ml-2 bg-[#1A1A1A] border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto" data-settings-buttons="true">
                <Button
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white w-full sm:w-auto border-0"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Google Calendar'
                  )}
                </Button>
                <p className="text-xs text-gray-400 text-right max-w-xs">
                  Add this to Google OAuth redirect URIs:<br />
                  <code className="bg-[#0F0F0F] border border-gray-700 px-1 rounded text-[10px] break-all text-gray-300">{redirectUri || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001') + '/api/auth/google/callback'}</code>
                </p>
              </div>
            )}
          </div>

          {connectionError && (
            <Alert variant="destructive" className="mb-4 border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{connectionError.title}</AlertTitle>
              <AlertDescription className="mt-2 flex flex-col gap-2">
                <p className="whitespace-pre-wrap">{connectionError.message}</p>
                {connectionError.link && (
                  <a
                    href={connectionError.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline hover:text-red-400 w-fit text-red-400"
                  >
                    Enable Calendar API <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-400 mb-4">
                Your calendar is connected. Tasks will be automatically scheduled based on your availability.
              </p>
            </div>
          )}

        </div>

        {/* Working Hours Settings */}
        <div className="bg-[#1A1A1A] rounded-md border border-gray-800 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Working Hours</h2>
          <p className="text-sm text-gray-400 mb-4">
            Tasks will only be scheduled during these hours. Default: 9:00 AM - 6:00 PM
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="mb-2 text-gray-300">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={workingHoursStart}
                className="bg-[#0F0F0F] border-gray-700 text-white focus:border-emerald-500"
                onChange={(e) => {
                  const value = e.target.value;
                  setWorkingHoursStart(value);
                  localStorage.setItem('working_hours_start', value);
                  console.log('[SETTINGS] ✅ Working hours START saved to localStorage:', value);
                  console.log('[SETTINGS] Full working hours:', `${value} - ${workingHoursEnd}`);
                }}
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="mb-2 text-gray-300">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={workingHoursEnd}
                className="bg-[#0F0F0F] border-gray-700 text-white focus:border-emerald-500"
                onChange={(e) => {
                  const value = e.target.value;
                  setWorkingHoursEnd(value);
                  localStorage.setItem('working_hours_end', value);
                  console.log('[SETTINGS] ✅ Working hours END saved to localStorage:', value);
                  console.log('[SETTINGS] Full working hours:', `${workingHoursStart} - ${value}`);
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="user-timezone" className="text-gray-300">Timezone</Label>
              <select
                id="user-timezone"
                value={userTimezone}
                onChange={(e) => {
                  setUserTimezone(e.target.value);
                  localStorage.setItem('user_timezone', e.target.value);
                  toast.success(`Timezone set to ${e.target.value}`);
                }}
                className="mt-1 w-full px-3 py-2 bg-[#0F0F0F] border border-gray-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="America/New_York">Eastern Time (America/New_York)</option>
                <option value="America/Chicago">Central Time (America/Chicago)</option>
                <option value="America/Denver">Mountain Time (America/Denver)</option>
                <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
                <option value="America/Phoenix">Arizona Time (America/Phoenix)</option>
                <option value="America/Anchorage">Alaska Time (America/Anchorage)</option>
                <option value="Pacific/Honolulu">Hawaii Time (Pacific/Honolulu)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">London (Europe/London)</option>
                <option value="Europe/Paris">Paris (Europe/Paris)</option>
                <option value="Asia/Tokyo">Tokyo (Asia/Tokyo)</option>
                <option value="Asia/Shanghai">Shanghai (Asia/Shanghai)</option>
                <option value="Australia/Sydney">Sydney (Australia/Sydney)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Select your timezone for accurate scheduling</p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcut Settings */}
        <div className="bg-[#1A1A1A] rounded-md border border-gray-800 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="w-6 h-6 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-400">Configure quick actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create-task-shortcut" className="mb-2 block text-gray-300">
                Create Task Shortcut
              </Label>
              <p className="text-sm text-gray-400 mb-3">
                Press this key to quickly open the create task dialog. Default: <kbd className="px-2 py-1 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">N</kbd>
              </p>
              <div className="flex items-center gap-3">
                <Input
                  id="create-task-shortcut"
                  type="text"
                  value={createTaskShortcut}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().trim();
                    // Only allow single letter or number
                    if (value.length <= 1 && /^[a-z0-9]$/.test(value)) {
                      setCreateTaskShortcut(value);
                      localStorage.setItem('create_task_shortcut', value);
                      toast.success(`Shortcut set to: ${value.toUpperCase()}`);
                    } else if (value.length > 1) {
                      // Take only the last character if multiple entered
                      const lastChar = value.slice(-1);
                      if (/^[a-z0-9]$/.test(lastChar)) {
                        setCreateTaskShortcut(lastChar);
                        localStorage.setItem('create_task_shortcut', lastChar);
                        toast.success(`Shortcut set to: ${lastChar.toUpperCase()}`);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent the shortcut from triggering while editing
                    e.stopPropagation();
                    const key = e.key.toLowerCase();
                    if (key.length === 1 && /^[a-z0-9]$/.test(key)) {
                      e.preventDefault();
                      setCreateTaskShortcut(key);
                      localStorage.setItem('create_task_shortcut', key);
                      toast.success(`Shortcut set to: ${key.toUpperCase()}`);
                    }
                  }}
                  placeholder="n"
                  className="w-20 font-mono text-center text-lg bg-[#0F0F0F] border-gray-700 text-white focus:border-emerald-500"
                  maxLength={1}
                />
                <div className="text-sm text-gray-500">
                  <p>Press any letter or number to set</p>
                  <p className="text-xs mt-1 text-gray-400">Current: <kbd className="px-2 py-1 bg-[#0F0F0F] border border-gray-700 rounded font-mono text-gray-300">{createTaskShortcut.toUpperCase()}</kbd></p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">K</kbd> or <kbd className="px-1.5 py-0.5 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">K</kbd> for common shortcuts, or a single letter like <kbd className="px-1.5 py-0.5 bg-[#0F0F0F] border border-gray-700 rounded text-xs font-mono text-gray-300">N</kbd>
              </p>
            </div>
          </div>
        </div>

        {/* Tag Management */}
        <TagManager />
      </div>
    </div>
  );
}
