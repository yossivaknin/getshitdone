'use client'

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, CheckCircle2, XCircle, Loader2, Search, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { testCalendarAPI } from '@/app/test-calendar';
import { listCalendarEvents } from '@/app/debug-calendar';
import { TagManager } from '@/components/tag-manager';

export default function SettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
  const [redirectUri, setRedirectUri] = useState('');

  // Check connection status on mount and handle OAuth callback
  useEffect(() => {
    // Set redirect URI on client side only
    setRedirectUri(`${window.location.origin}/api/auth/google/callback`);
    
    // Check URL params for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const token = urlParams.get('token');
    const refresh = urlParams.get('refresh');
    
    if (connected === 'true' && token) {
      localStorage.setItem('google_calendar_token', token);
      if (refresh) {
        localStorage.setItem('google_calendar_refresh_token', refresh);
      }
      setIsConnected(true);
      toast.success('Successfully connected to Google Calendar!');
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    }
    
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Check if we have stored tokens
      const token = localStorage.getItem('google_calendar_token');
      setIsConnected(!!token);
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    
    try {
      // Generate OAuth URL
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
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
    try {
      const result = await testCalendarAPI(accessToken, refreshToken || undefined);
      if (result.success) {
        toast.success(result.message + ` Created test event. Check your calendar!`);
        console.log('Test details:', result.details);
      } else {
        toast.error(result.message);
        console.error('Test failed:', result.details);
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Failed to test connection');
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
          toast.warning('No events found with "[Focus]" in the next 30 days');
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
              <ol className="text-sm text-gray-500 list-decimal list-inside space-y-1">
                <li>Create a Google Cloud Project and enable Calendar API</li>
                <li>Create OAuth 2.0 credentials</li>
                <li>Add <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to your .env file</li>
                <li>Set authorized redirect URI to: <code className="bg-gray-100 px-1 rounded">{redirectUri || '/api/auth/google/callback'}</code></li>
              </ol>
            </div>
          )}
        </div>

        {/* Working Hours Settings */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Working Hours</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tasks will only be scheduled during these hours. Default: 9:00 AM - 6:00 PM
          </p>
          
          <div className="grid grid-cols-2 gap-4">
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
