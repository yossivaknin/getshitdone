'use server'

import { getBusySlots, createCalendarEvent, CalendarConfig } from '@/lib/calendar';
import { refreshAccessToken } from '@/lib/token-refresh';

export async function testCalendarAPI(accessToken: string, refreshToken?: string, expectedClientId?: string) {
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
      
      // Extract project number from Client ID (format: PROJECT_NUMBER-xxx.apps.googleusercontent.com)
      const projectNumber = tokenInfo.audience?.split('-')[0] || 'unknown';
      
      console.log('[TEST] ✅ Token is valid:', {
        expires_in: tokenInfo.expires_in,
        scope: tokenInfo.scope,
        audience: tokenInfo.audience,
        issued_to: tokenInfo.issued_to,
        projectNumber: projectNumber
      });

      // Verify calendar scope
      if (!tokenInfo.scope || !tokenInfo.scope.includes('calendar')) {
        return {
          success: false,
          message: 'Token does not have calendar scope. Please reconnect and grant calendar permissions.',
          details: `Token scope: ${tokenInfo.scope || 'none'}`
        };
      }
      
      // Log important info for debugging
      console.log('[TEST] 🔍 IMPORTANT: Your OAuth token belongs to project:', projectNumber);
      console.log('[TEST] 🔍 Make sure Calendar API is enabled in project:', projectNumber);
      console.log('[TEST] 🔍 Check: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=' + projectNumber);

      // Log token audience (Client ID) for debugging
      // Note: We don't require it to match the configured Client ID - if the token works, that's what matters
      const configuredClientId = expectedClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

      console.log('[TEST] Token audience info:', {
        tokenAudience: tokenInfo.audience,
        configuredClientId: configuredClientId,
        source: expectedClientId ? 'frontend' : 'env'
      });

      // Only log a warning if they differ - don't block the test
      if (configuredClientId && tokenInfo.audience && tokenInfo.audience !== configuredClientId) {
        console.warn('[TEST] ⚠️ Token audience differs from configured Client ID (this is usually fine if the token works):', {
          tokenAudience: tokenInfo.audience,
          configuredClientId: configuredClientId
        });
        // Don't return error - let the API test proceed to see if the token actually works
      }
    }

    // Test 2: Try a simple Calendar API call first (list calendars)
    console.log('[TEST] Step 2: Testing Calendar API access with simple call...');
    try {
      // Test WITHOUT any project headers first - let Google infer from token
      const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
      });

      console.log('[TEST] Calendar list API response:', {
        status: calendarListResponse.status,
        statusText: calendarListResponse.statusText,
        ok: calendarListResponse.ok,
        url: calendarListResponse.url
      });

      if (!calendarListResponse.ok) {
        const errorText = await calendarListResponse.text();
        const isHtml = errorText.includes('<!DOCTYPE html>') || errorText.includes('<html');
        
        console.error('[TEST] Calendar list API failed:', {
          status: calendarListResponse.status,
          statusText: calendarListResponse.statusText,
          errorPreview: errorText.substring(0, 1000),
          isHtml: isHtml,
          responseHeaders: Object.fromEntries(calendarListResponse.headers.entries()),
          responseUrl: calendarListResponse.url
        });

        if (calendarListResponse.status === 404) {
          // Extract project number from token
          const projectNumber = tokenInfo.audience?.split('-')[0] || 'unknown';
          
          // Check if it's an HTML 404 (API not accessible) vs JSON 404
          if (isHtml) {
            // Extract more details from the HTML response
            const htmlPreview = errorText.substring(0, 2000);
            console.error('[TEST] Full HTML 404 response preview:', htmlPreview);
            
            // Even with billing enabled, sometimes API needs to be refreshed
            return {
              success: false,
              message: 'Calendar API returned 404 HTML page. This means Google cannot find the Calendar API endpoint.',
              details: `Status: ${calendarListResponse.status}. HTML 404 response received.

🔍 DIAGNOSTIC INFO:
- Your OAuth Client ID: ${tokenInfo.audience}
- Project Number (from Client ID): ${projectNumber}
- Token has calendar scope: ✅ Yes

This usually means:
1. Calendar API is NOT enabled in project ${projectNumber}
2. Calendar API is enabled in a DIFFERENT project than your OAuth token
3. The API was disabled or needs to be re-enabled
4. There's a billing/quota restriction

ACTION REQUIRED:
1. Go to: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=${projectNumber}
2. Make sure you're viewing project: ${projectNumber} (check the project selector at the top)
3. Verify Calendar API shows "ENABLED" (not just created)
4. If it's enabled but still failing:
   - Disable Calendar API
   - Wait 30 seconds
   - Re-enable it
   - Wait 5-10 minutes for propagation
5. Check billing: https://console.cloud.google.com/billing?project=${projectNumber}
6. Check quotas: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas?project=${projectNumber}

⚠️ IMPORTANT: Make sure you're checking project ${projectNumber}, not a different project!`
            };
          } else {
            // JSON 404 - different issue
            try {
              const errorJson = JSON.parse(errorText);
              return {
                success: false,
                message: 'Calendar API returned 404 JSON error.',
                details: `Status: ${calendarListResponse.status}. Error: ${JSON.stringify(errorJson, null, 2)}

Your token's project: ${projectNumber}
Make sure Calendar API is enabled in project ${projectNumber}`
              };
            } catch {
              return {
                success: false,
                message: 'Calendar API returned 404.',
                details: `Status: ${calendarListResponse.status}. Error: ${errorText.substring(0, 200)}

Your token's project: ${projectNumber}
Make sure Calendar API is enabled in project ${projectNumber}`
              };
            }
          }
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
