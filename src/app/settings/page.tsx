'use client'

import { useState, useEffect } from 'react';
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setRedirectUri(`${baseUrl}/api/auth/google/callback`);

    // Check URL params for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const token = urlParams.get('token');
    const refresh = urlParams.get('refresh');

    if (connected === 'true' && token) {
      console.log('[Settings] OAuth callback received:', {
        hasToken: !!token,
        hasRefresh: !!refresh,
        tokenLength: token.length,
        tokenPreview: token.substring(0, 20) + '...',
        tokenStartsWith: token.substring(0, 5)
      });
      
      // Validate token format - access tokens usually start with 'ya29.' or similar
      // Refresh tokens start with '1//'
      if (token.startsWith('1//')) {
        console.error('[Settings] ❌ ERROR: Received refresh token as access token!');
        console.error('[Settings] This means the OAuth response had tokens swapped or missing access_token');
        toast.error('OAuth error: Received refresh token instead of access token. Please try again.');
        return;
      }

      localStorage.setItem('google_calendar_token', token);
      if (refresh) {
        localStorage.setItem('google_calendar_refresh_token', refresh);
        console.log('[Settings] Refresh token saved:', refresh.substring(0, 20) + '...');
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

      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (urlParams.get('error')) {
      const error = urlParams.get('error');
      console.error('[Settings] OAuth error:', error);
      toast.error(`Connection failed: ${error}. Please try again.`);
    }

    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Check if we have stored tokens
      const token = localStorage.getItem('google_calendar_token');
      const refreshToken = localStorage.getItem('google_calendar_refresh_token');

      if (!token) {
        setIsConnected(false);
        return;
      }

      // Validate token by making a test API call
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);

        if (response.ok) {
          const data = await response.json();
          console.log('[Settings] Token is valid:', {
            expires_in: data.expires_in,
            scope: data.scope
          });
          setIsConnected(true);
        } else {
          // Token is invalid, try to refresh if we have refresh token
          if (refreshToken) {
            console.log('[Settings] Token invalid, attempting refresh...');
            const { refreshAccessToken } = await import('@/lib/token-refresh');
            const newToken = await refreshAccessToken(refreshToken);

            if (newToken) {
              localStorage.setItem('google_calendar_token', newToken);
              setIsConnected(true);
              console.log('[Settings] ✅ Token refreshed successfully');
            } else {
              console.error('[Settings] ❌ Token refresh failed');
              setIsConnected(false);
            }
          } else {
            console.error('[Settings] ❌ Token invalid and no refresh token available');
            setIsConnected(false);
          }
        }
      } catch (error) {
        console.error('[Settings] Error validating token:', error);
        // If validation fails, still show as connected if token exists
        // (might be a network issue)
        setIsConnected(!!token);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setConnectionError(null);

    try {
      // Generate OAuth URL
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

      // Use NEXT_PUBLIC_APP_URL if set, otherwise use current origin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectUri = `${baseUrl}/api/auth/google/callback`;

      // Log for debugging
      console.log('[OAuth Debug] Redirect URI:', redirectUri);
      console.log('[OAuth Debug] Current origin:', window.location.origin);
      console.log('[OAuth Debug] NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
      console.log('[OAuth Debug] Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET');

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

      // Redirect to Google OAuth
      window.location.href = authUrl;
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
      const result = await testCalendarAPI(accessToken, refreshToken || undefined, clientId);
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
    <div className="min-h-screen bg-[#F4F5F7] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/app"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Mission Control
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500">Configure your Google Calendar integration</p>
        </div>

        {/* Google Calendar Connection */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Google Calendar</h2>
                <p className="text-sm text-gray-500">Connect your calendar for smart scheduling</p>
              </div>
            </div>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">Connected</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="ml-2"
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
                  className="ml-2"
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
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="ml-2">
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="bg-blue-500 hover:bg-blue-600 text-white"
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
            )}
          </div>

          {connectionError && (
            <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{connectionError.title}</AlertTitle>
              <AlertDescription className="mt-2 flex flex-col gap-2">
                <p className="whitespace-pre-wrap">{connectionError.message}</p>
                {connectionError.link && (
                  <a
                    href={connectionError.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline hover:text-red-800 w-fit"
                  >
                    Enable Calendar API <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4">
                Your calendar is connected. Tasks will be automatically scheduled based on your availability.
              </p>
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-2">
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="text-sm text-gray-500 list-decimal list-inside space-y-1 mb-4">
                <li>Create a Google Cloud Project and enable Calendar API</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your .env file</li>
                <li>Set authorized redirect URI to: <code className="bg-gray-100 px-1 rounded">{redirectUri || '/api/auth/google/callback'}</code></li>
              </ol>

              {/* Debug Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                <p className="font-semibold mb-2">Debug Info:</p>
                <p>Token in localStorage: {typeof window !== 'undefined' && localStorage.getItem('google_calendar_token') ? '✅ Found' : '❌ Not found'}</p>
                <p>Refresh token: {typeof window !== 'undefined' && localStorage.getItem('google_calendar_refresh_token') ? '✅ Found' : '❌ Not found'}</p>
                <p>Redirect URI: {redirectUri || 'Not set'}</p>
                <p>Client ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Not set'}</p>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      console.log('[Settings Debug] Token:', localStorage.getItem('google_calendar_token'));
                      console.log('[Settings Debug] Refresh Token:', localStorage.getItem('google_calendar_refresh_token'));
                      console.log('[Settings Debug] Redirect URI:', redirectUri);
                      console.log('[Settings Debug] Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
                      toast.success('Debug info logged to console (F12)');
                    }
                  }}
                  className="mt-2 text-blue-600 hover:underline"
                >
                  Log debug info to console
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Working Hours Settings */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tasks will only be scheduled during these hours. Default: 9:00 AM - 6:00 PM
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="mb-2">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={workingHoursStart}
                onChange={(e) => {
                  setWorkingHoursStart(e.target.value);
                  localStorage.setItem('working_hours_start', e.target.value);
                }}
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="mb-2">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={workingHoursEnd}
                onChange={(e) => {
                  setWorkingHoursEnd(e.target.value);
                  localStorage.setItem('working_hours_end', e.target.value);
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="user-timezone">Timezone</Label>
              <select
                id="user-timezone"
                value={userTimezone}
                onChange={(e) => {
                  setUserTimezone(e.target.value);
                  localStorage.setItem('user_timezone', e.target.value);
                  toast.success(`Timezone set to ${e.target.value}`);
                }}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard className="w-6 h-6 text-gray-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <p className="text-sm text-gray-500">Configure quick actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create-task-shortcut" className="mb-2 block">
                Create Task Shortcut
              </Label>
              <p className="text-sm text-gray-500 mb-3">
                Press this key to quickly open the create task dialog. Default: <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">N</kbd>
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
                  className="w-20 font-mono text-center text-lg"
                  maxLength={1}
                />
                <div className="text-sm text-gray-500">
                  <p>Press any letter or number to set</p>
                  <p className="text-xs mt-1">Current: <kbd className="px-2 py-1 bg-gray-100 rounded font-mono">{createTaskShortcut.toUpperCase()}</kbd></p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                💡 Tip: Use <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">K</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">K</kbd> for common shortcuts, or a single letter like <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">N</kbd>
              </p>
            </div>
          </div>
        </div>

        {/* Tag Management */}
        <TagManager />

        {/* Smart Schedule Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Smart Schedule</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Automatic Scheduling</p>
                <p className="text-sm text-gray-500">
                  Tasks longer than 1 hour will be split into 1-hour chunks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Conflict Resolution</p>
                <p className="text-sm text-gray-500">
                  If no slots are available, you'll be notified to adjust the due date or duration
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Naming Convention</p>
                <p className="text-sm text-gray-500">
                  Events will be named: [Focus] Task Name (Part X/Y)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
