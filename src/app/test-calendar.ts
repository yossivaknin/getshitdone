'use server'

import { getBusySlots, createCalendarEvent, CalendarConfig } from '@/lib/calendar';
import { refreshAccessToken } from '@/lib/token-refresh';

export async function testCalendarAPI(accessToken: string, refreshToken?: string) {
  try {
    console.log('[TEST] Starting Calendar API test...');
    console.log('[TEST] Token preview:', accessToken.substring(0, 20) + '...');

    // Test token validity and get detailed info
    let validToken = accessToken;

    console.log('[TEST] Step 1: Validating token...');
    const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);

    if (!tokenTest.ok) {
      const errorText = await tokenTest.text();
      console.error('[TEST] Token validation failed:', {
        status: tokenTest.status,
        error: errorText
      });

      if (refreshToken) {
        console.log('[TEST] Token expired, attempting refresh...');
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          validToken = newToken;
          console.log('[TEST] ✅ Token refreshed successfully');
        } else {
          return {
            success: false,
            message: 'Token expired and refresh failed. Please reconnect.',
            details: errorText
          };
        }
      } else {
        return {
          success: false,
          message: 'Token validation failed. Please reconnect.',
          details: errorText
        };
      }
    } else {
      const tokenInfo = await tokenTest.json();
      console.log('[TEST] ✅ Token is valid:', {
        expires_in: tokenInfo.expires_in,
        scope: tokenInfo.scope,
        audience: tokenInfo.audience,
        issued_to: tokenInfo.issued_to
      });

      // Verify calendar scope
      if (!tokenInfo.scope || !tokenInfo.scope.includes('calendar')) {
        return {
          success: false,
          message: 'Token does not have calendar scope. Please reconnect and grant calendar permissions.',
          details: `Token scope: ${tokenInfo.scope || 'none'}`
        };
      }

      // Verify token audience (Client ID) matches current configuration
      // This prevents using a stale token from a different project
      const configuredClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      if (configuredClientId && tokenInfo.audience && tokenInfo.audience !== configuredClientId) {
        console.error('[TEST] ❌ Token audience mismatch!', {
          tokenAudience: tokenInfo.audience,
          configuredClientId: configuredClientId
        });
        return {
          success: false,
          message: 'Token mismatch: The stored token belongs to a different Google Cloud Project. Please disconnect and reconnect.',
          details: `Token Client ID: ${tokenInfo.audience}\nConfigured Client ID: ${configuredClientId}`
        };
      }
    }

    // Test 2: Try a simple Calendar API call first (list calendars)
    console.log('[TEST] Step 2: Testing Calendar API access with simple call...');
    try {
      const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      console.log('[TEST] Calendar list API response:', {
        status: calendarListResponse.status,
        statusText: calendarListResponse.statusText,
        ok: calendarListResponse.ok
      });

      if (!calendarListResponse.ok) {
        const errorText = await calendarListResponse.text();
        console.error('[TEST] Calendar list API failed:', errorText.substring(0, 500));

        if (calendarListResponse.status === 404) {
          return {
            success: false,
            message: 'Calendar API returned 404. The API is not enabled in your Google Cloud project, or it\'s enabled in a different project than your OAuth credentials.',
            details: `Status: ${calendarListResponse.status}. Error: ${errorText.substring(0, 200)}`
          };
        }
      } else {
        console.log('[TEST] ✅ Calendar list API works! API is accessible.');
      }
    } catch (error: any) {
      console.error('[TEST] Error testing calendar list API:', error);
      return {
        success: false,
        message: 'Failed to access Calendar API. Check that the API is enabled.',
        details: error.message || String(error)
      };
    }

    const config: CalendarConfig = {
      accessToken: validToken,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00'
    };

    // Test 3: Get busy slots (FreeBusy API)
    console.log('[TEST] Step 3: Testing FreeBusy API...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const busySlots = await getBusySlots(config, now, tomorrow);

    // Test 2: Create a test event
    const testStart = new Date(now);
    testStart.setHours(10, 0, 0, 0); // 10 AM today
    const testEnd = new Date(testStart);
    testEnd.setMinutes(testEnd.getMinutes() + 30); // 30 minutes

    const testEventId = await createCalendarEvent(
      config,
      '[Focus] Test Event - Please Delete',
      testStart,
      testEnd
    );


    return {
      success: true,
      message: 'Calendar API is working!',
      details: {
        busySlotsCount: busySlots.length,
        testEventId,
        testEventTime: testStart.toISOString()
      }
    };
  } catch (error: any) {
    console.error('[TEST] Calendar API test error:', error);
    const errorMessage = error.message || String(error);

    // Provide more specific error messages
    let userMessage = 'Calendar API test failed';
    if (errorMessage.includes('404')) {
      userMessage = 'Calendar API returned 404. The API may not be enabled in your Google Cloud project, or it\'s enabled in a different project than your OAuth credentials.';
    } else if (errorMessage.includes('403')) {
      userMessage = 'Calendar API access denied (403). Check that your token has calendar scope and the API is enabled.';
    } else if (errorMessage.includes('401')) {
      userMessage = 'Calendar API authentication failed (401). Your token may have expired. Please reconnect.';
    }

    return {
      success: false,
      message: userMessage,
      details: errorMessage
    };
  }
}
