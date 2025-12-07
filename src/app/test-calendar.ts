'use server'

import { getBusySlots, createCalendarEvent, CalendarConfig } from '@/lib/calendar';
import { refreshAccessToken } from '@/lib/token-refresh';

export async function testCalendarAPI(accessToken: string, refreshToken?: string) {
  try {
    // Test token validity
    let validToken = accessToken;
    
    const tokenTest = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    if (!tokenTest.ok && refreshToken) {
      console.log('Token expired, refreshing...');
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) {
        validToken = newToken;
      } else {
        return {
          success: false,
          message: 'Token expired and refresh failed. Please reconnect.',
          details: await tokenTest.text()
        };
      }
    }
    
    const config: CalendarConfig = {
      accessToken: validToken,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00'
    };
    
    // Test 1: Get busy slots
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
