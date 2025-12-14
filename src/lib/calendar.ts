// Google Calendar API utilities
// This will be used server-side for calendar operations

export interface CalendarEvent {
  start: Date;
  end: Date;
  summary: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface CalendarConfig {
  accessToken: string;
  refreshToken?: string;
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "18:00"
}

/**
 * Get Google Cloud Project ID from environment variables or extract from Client ID
 * Client ID format: PROJECT_NUMBER-xxx.apps.googleusercontent.com
 * 
 * This function automatically extracts the project number from the Client ID,
 * so you don't need to set GOOGLE_PROJECT_ID separately.
 */
export function getGoogleProjectId(): string | null {
  // First, try explicit environment variables
  if (process.env.GOOGLE_PROJECT_ID) {
    return process.env.GOOGLE_PROJECT_ID;
  }
  if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
    return process.env.GOOGLE_CLOUD_PROJECT_ID;
  }
  
  // If not set, try to extract from Client ID
  // Client ID format: PROJECT_NUMBER-xxx.apps.googleusercontent.com
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (clientId) {
    const match = clientId.match(/^(\d+)-/);
    if (match && match[1]) {
      console.log('[CALENDAR] Extracted project ID from Client ID:', match[1]);
      return match[1];
    }
  }
  
  // If we can't determine it, return null (caller should handle this)
  console.warn('[CALENDAR] ⚠️ Could not determine Google Project ID. Please set GOOGLE_PROJECT_ID environment variable.');
  return null;
}

/**
 * Query Google Calendar for busy slots between two dates
 */
export async function getBusySlots(
  config: CalendarConfig,
  timeMin: Date,
  timeMax: Date
): Promise<TimeSlot[]> {
  console.log('[CALENDAR] Fetching busy slots...');
  console.log('[CALENDAR] Time range:', timeMin.toISOString(), 'to', timeMax.toISOString());
  
  // First, verify token has calendar scope and get project info
  let tokenProjectId: string | null = null;
  try {
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${config.accessToken}`);
    if (tokenInfoResponse.ok) {
      const tokenInfo = await tokenInfoResponse.json();
      console.log('[CALENDAR] Token info:', {
        expires_in: tokenInfo.expires_in,
        scope: tokenInfo.scope,
        audience: tokenInfo.audience,
        issued_to: tokenInfo.issued_to,
        user_id: tokenInfo.user_id
      });
      
      // Check if token has calendar scope
      if (tokenInfo.scope && !tokenInfo.scope.includes('calendar')) {
        console.error('[CALENDAR] ❌ Token does NOT have calendar scope!');
        console.error('[CALENDAR] Token scope:', tokenInfo.scope);
        throw new Error('Token does not have Google Calendar scope. Please reconnect Google Calendar in Settings and grant calendar permissions.');
      }
      
      // Extract project ID from token's audience (Client ID)
      // Client ID format: PROJECT_NUMBER-xxx.apps.googleusercontent.com
      if (tokenInfo.audience) {
        console.log('[CALENDAR] Token audience (Client ID):', tokenInfo.audience);
        const match = tokenInfo.audience.match(/^(\d+)-/);
        if (match && match[1]) {
          tokenProjectId = match[1];
          console.log('[CALENDAR] ✅ Extracted project ID from token:', tokenProjectId);
          console.log('[CALENDAR] ⚠️ IMPORTANT: Make sure Calendar API is enabled in project:', tokenProjectId);
        }
      }
    } else {
      const errorText = await tokenInfoResponse.text();
      console.warn('[CALENDAR] ⚠️ Could not verify token info:', {
        status: tokenInfoResponse.status,
        error: errorText
      });
    }
  } catch (error) {
    console.warn('[CALENDAR] ⚠️ Error checking token info:', error);
    // Continue anyway - the API call will fail with a better error
  }
  
  try {
    const requestBody = {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    };
    
    console.log('[CALENDAR] Request body:', JSON.stringify(requestBody, null, 2));
    console.log('[CALENDAR] API endpoint: https://www.googleapis.com/calendar/v3/freebusy');
    console.log('[CALENDAR] Token preview:', config.accessToken.substring(0, 20) + '...');
    
    // Don't add X-Goog-User-Project header - let Google infer the project from the OAuth token
    // The Calendar list API works without this header, so FreeBusy should too
    // Adding the wrong project ID causes 404 errors
    const googleApiKey = process.env.GOOGLE_API_KEY;
    
    // Build URL with API key if available (optional - helps with project identification)
    let apiUrl = `https://www.googleapis.com/calendar/v3/freebusy`;
    if (googleApiKey) {
      apiUrl += `?key=${encodeURIComponent(googleApiKey)}`;
    }
    
    // Build headers - NO X-Goog-User-Project header
    // Google will automatically infer the project from the OAuth token's audience
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
    
    if (tokenProjectId) {
      console.log('[CALENDAR] Token belongs to project:', tokenProjectId, '- Google will infer this from token (no header needed)');
    } else {
      console.log('[CALENDAR] No project ID extracted - Google will infer from OAuth token');
    }
    
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log('[CALENDAR] Response status:', response.status, response.statusText);
    console.log('[CALENDAR] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch busy slots';
      let errorDetails: any = {};
      
      // Check if we got an HTML response (404 page) - this usually means API isn't enabled
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
        console.error('[CALENDAR] ❌ Got HTML 404 response');
        console.error('[CALENDAR] Full error response (first 1000 chars):', errorText.substring(0, 1000));
        console.error('[CALENDAR] Response URL:', response.url);
        console.error('[CALENDAR] Response headers:', Object.fromEntries(response.headers.entries()));
        
        // If it was working before and suddenly stopped, possible causes:
        // 1. OAuth consent screen needs re-verification
        // 2. API quotas were hit
        // 3. Google made API changes
        // 4. The API got disabled somehow
        throw new Error(`Google Calendar API returned 404 HTML page. Since this was working before and suddenly stopped, possible causes:
1. OAuth consent screen needs re-verification: https://console.cloud.google.com/apis/credentials/consent
2. API quotas were hit: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/quotas
3. The API got disabled: Check https://console.cloud.google.com/apis/dashboard
4. Google API changes or temporary issues

Try:
- Re-verify OAuth consent screen
- Check if API is still enabled
- Check quotas for any limits
- Disable and re-enable Calendar API
- Wait 10-15 minutes and try again`);
      }
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
        errorDetails = errorJson.error || {};
      } catch {
        // If it's not JSON and not HTML, use the text as-is
        errorMessage = errorText.substring(0, 200) || errorMessage; // Limit length
      }
      
      console.error('[CALENDAR] ❌ Error fetching busy slots:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
        responsePreview: errorText.substring(0, 100)
      });
      
      // Provide specific guidance based on status code
      if (response.status === 404) {
        // Check if it's an HTML 404 (API not enabled) vs JSON 404 (different issue)
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
          // Try to get token info to show the Client ID
          let clientIdInfo = '';
          try {
            const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${config.accessToken}`);
            if (tokenInfoResponse.ok) {
              const tokenInfo = await tokenInfoResponse.json();
              if (tokenInfo.audience) {
                clientIdInfo = `\n\nYour OAuth Client ID: ${tokenInfo.audience}\nMake sure Calendar API is enabled in the SAME project as this Client ID!`;
              }
            }
          } catch (e) {
            // Ignore errors getting token info
          }
          
          throw new Error(`Google Calendar API returned 404 HTML page. This usually means:
1. The Calendar API is NOT enabled in your Google Cloud project
2. Your token may not have the calendar scope (try reconnecting)
3. There's a billing/quota issue

Please verify:
- Enable Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- Verify your token has calendar scope (disconnect and reconnect in Settings)
- Check billing: https://console.cloud.google.com/billing${clientIdInfo}`);
        } else {
          throw new Error(`Google Calendar API endpoint not found (404). The Calendar API may not be enabled in your Google Cloud project, or there may be a billing/quota issue. Please check: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com`);
        }
      } else if (response.status === 403) {
        throw new Error(`Google Calendar API access denied (403). Possible causes:
1. Token doesn't have calendar scope - reconnect and grant calendar permissions
2. Calendar API not enabled in the project
3. Billing/quota restrictions`);
      } else if (response.status === 401) {
        throw new Error(`Google Calendar API authentication failed (401). Your access token may have expired. Please reconnect your Google Calendar in Settings.`);
      }
      
      // Throw error with details so caller can handle it properly
      throw new Error(`Google Calendar API error (${response.status}): ${errorMessage}. ${errorDetails.error_description || ''}`);
    }

    const data = await response.json();
    console.log('[CALENDAR] Response data:', JSON.stringify(data, null, 2));
    
    const busySlots: TimeSlot[] = [];

    if (data.calendars?.primary?.busy) {
      console.log('[CALENDAR] ✅ Found', data.calendars.primary.busy.length, 'busy periods from Google Calendar FreeBusy API');
      for (const busy of data.calendars.primary.busy) {
        const startDate = new Date(busy.start);
        const endDate = new Date(busy.end);
        busySlots.push({
          start: startDate,
          end: endDate,
        });
        console.log(`[CALENDAR]   Busy: ${startDate.toISOString()} to ${endDate.toISOString()} (${startDate.toLocaleString()} - ${endDate.toLocaleString()})`);
      }
    } else {
      console.warn('[CALENDAR] ⚠️ No busy periods found in FreeBusy API response. This might mean:');
      console.warn('[CALENDAR]   1. Calendar is completely free (unlikely if you have meetings)');
      console.warn('[CALENDAR]   2. FreeBusy API is not returning data correctly');
      console.warn('[CALENDAR]   3. Calendar permissions issue');
    }

    console.log(`[CALENDAR] Total busy slots from FreeBusy API: ${busySlots.length}`);
    if (busySlots.length === 0) {
      console.warn('[CALENDAR] ⚠️ WARNING: No busy slots found! Conflict detection will not work for external meetings!');
    }
    return busySlots;
  } catch (error: any) {
    console.error('[CALENDAR] ❌ Exception in getBusySlots:', error);
    // Re-throw with context so caller knows what went wrong
    if (error.message) {
      throw error; // Re-throw if it's already a proper Error
    }
    throw new Error(`Failed to fetch busy slots from Google Calendar: ${error.message || String(error)}`);
  }
}

/**
 * Find free time slots during working hours
 */
export function findFreeSlots(
  busySlots: TimeSlot[],
  timeMin: Date,
  timeMax: Date,
  workingHoursStart: string,
  workingHoursEnd: string,
  durationMinutes: number
): TimeSlot[] {
  const freeSlots: TimeSlot[] = [];
  const [startHour, startMin] = workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = workingHoursEnd.split(':').map(Number);
  
  // Start from NOW or timeMin, whichever is later (don't schedule in the past!)
  const now = new Date();
  const startFrom = timeMin > now ? timeMin : now;
  let currentDate = new Date(startFrom);
  
  // If we're starting today, set to working hours start, but don't go back in time
  if (currentDate.getDate() === now.getDate() && 
      currentDate.getMonth() === now.getMonth() && 
      currentDate.getFullYear() === now.getFullYear()) {
    // Today - start from now or working hours start, whichever is later
    const todayStart = new Date(currentDate);
    todayStart.setHours(startHour, startMin, 0, 0);
    currentDate = todayStart > now ? todayStart : now;
    // Round up to next 15 minutes
    const minutes = currentDate.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    currentDate.setMinutes(roundedMinutes, 0, 0);
  } else {
    // Future date - start from working hours
    currentDate.setHours(startHour, startMin, 0, 0);
  }
  
  const endDate = new Date(timeMax);
  endDate.setHours(endHour, endMin, 0, 0);
  
  console.log('[FREESLOTS] Searching from:', currentDate.toISOString(), 'to', endDate.toISOString());
  console.log('[FREESLOTS] Working hours:', `${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}`);
  console.log('[FREESLOTS] Total busy slots received:', busySlots.length);
  
  // Sort busy slots by start time
  const sortedBusy = [...busySlots].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Log all busy slots for debugging
  if (sortedBusy.length > 0) {
    console.log('[FREESLOTS] Busy slots to avoid:');
    sortedBusy.forEach((busy, idx) => {
      console.log(`  [${idx + 1}] ${new Date(busy.start).toISOString()} - ${new Date(busy.end).toISOString()}`);
    });
  } else {
    console.log('[FREESLOTS] WARNING: No busy slots provided! This means conflict detection may not work.');
  }
  
  // Search for free slots over the next 7 days
  const maxDays = 7;
  let daysChecked = 0;
  
  while (currentDate < endDate && daysChecked < maxDays) {
    // Ensure we're starting at the beginning of working hours for this day
    const dayStart = new Date(currentDate);
    dayStart.setHours(startHour, startMin, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMin, 0, 0);
    
    // If current time is before working hours start, move to start
    if (currentDate < dayStart) {
      currentDate = new Date(dayStart);
    }
    
    // If current time is after working hours end, move to next day
    if (currentDate >= dayEnd) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
      continue;
    }
    
    // Calculate slot end
    const slotEnd = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);
    
    // STRICT CHECK: Slot must be completely within working hours
    const slotStartHour = currentDate.getHours();
    const slotStartMin = currentDate.getMinutes();
    const slotEndHour = slotEnd.getHours();
    const slotEndMin = slotEnd.getMinutes();
    
    // Check if slot starts before working hours (shouldn't happen after above check, but be safe)
    if (slotStartHour < startHour || (slotStartHour === startHour && slotStartMin < startMin)) {
      currentDate = new Date(dayStart);
      continue;
    }
    
    // Check if slot ends after working hours - if so, move to next day
    if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
      continue;
    }
    
    // Final validation: ensure slot is within the day's working hours
    if (slotEnd > dayEnd) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
      continue;
    }
    
    // Check if slot conflicts with busy slots - improved conflict detection
    const slotStart = currentDate.getTime();
    const slotEndTime = slotEnd.getTime();
    
    const hasConflict = sortedBusy.some(busy => {
      const busyStart = busy.start.getTime();
      const busyEnd = busy.end.getTime();
      
      // Check for any overlap: slots overlap if one starts before the other ends
      // This catches all overlap scenarios:
      // - New slot starts during busy slot (slotStart >= busyStart && slotStart < busyEnd)
      // - New slot ends during busy slot (slotEndTime > busyStart && slotEndTime <= busyEnd)
      // - New slot completely contains busy slot (slotStart <= busyStart && slotEndTime >= busyEnd)
      // - Busy slot completely contains new slot (busyStart <= slotStart && busyEnd >= slotEndTime)
      const overlaps = (slotStart < busyEnd && slotEndTime > busyStart);
      
      if (overlaps) {
        console.log(`[FREESLOTS] ⚠️ CONFLICT DETECTED:`, {
          proposedSlot: `${new Date(slotStart).toISOString()} - ${new Date(slotEndTime).toISOString()}`,
          busySlot: `${new Date(busyStart).toISOString()} - ${new Date(busyEnd).toISOString()}`,
          overlapType: slotStart >= busyStart && slotEndTime <= busyEnd ? 'completely inside busy slot' :
                      slotStart <= busyStart && slotEndTime >= busyEnd ? 'completely contains busy slot' :
                      slotStart < busyEnd && slotStart >= busyStart ? 'starts during busy slot' :
                      slotEndTime > busyStart && slotEndTime <= busyEnd ? 'ends during busy slot' : 'overlaps'
        });
      }
      
      return overlaps;
    });
    
    // Final validation before adding slot
    if (hasConflict) {
      console.log(`[FREESLOTS] ⚠️ Slot skipped due to conflict with busy slot`);
      // Move to next potential slot
      currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
      continue;
    }
    
    if (slotEnd <= endDate) {
      // Double-check that the slot is within working hours
      const finalStartHour = currentDate.getHours();
      const finalStartMin = currentDate.getMinutes();
      const finalEndHour = slotEnd.getHours();
      const finalEndMin = slotEnd.getMinutes();
      
      const isValidStart = finalStartHour > startHour || 
        (finalStartHour === startHour && finalStartMin >= startMin);
      const isValidEnd = finalEndHour < endHour || 
        (finalEndHour === endHour && finalEndMin <= endMin);
      
      if (isValidStart && isValidEnd) {
        // TRIPLE-CHECK: Verify no conflicts one more time before adding
        const finalCheckConflict = sortedBusy.some(busy => {
          const busyStart = busy.start.getTime();
          const busyEnd = busy.end.getTime();
          return (slotStart < busyEnd && slotEndTime > busyStart);
        });
        
        if (finalCheckConflict) {
          console.warn(`[FREESLOTS] ⚠️ Slot failed final conflict check - skipping`);
          currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
          continue;
        }
        
        freeSlots.push({
          start: new Date(currentDate),
          end: new Date(slotEnd)
        });
        
        console.log(`[FREESLOTS] ✅ Found valid slot: ${new Date(currentDate).toISOString()} to ${slotEnd.toISOString()}`);
        console.log(`[FREESLOTS] Slot time: ${finalStartHour}:${finalStartMin.toString().padStart(2, '0')} - ${finalEndHour}:${finalEndMin.toString().padStart(2, '0')}`);
        console.log(`[FREESLOTS] ✅ Verified: No conflicts with ${sortedBusy.length} busy slots`);
        
        // If we found enough slots, we can return early
        // For now, let's find at least one good slot
        if (freeSlots.length >= 1) {
          break;
        }
      } else {
        console.warn(`[FREESLOTS] ❌ Slot rejected - outside working hours:`, {
          start: `${finalStartHour}:${finalStartMin}`,
          end: `${finalEndHour}:${finalEndMin}`,
          workingHours: `${startHour}:${startMin} - ${endHour}:${endMin}`
        });
      }
    }
    
    // Move to next potential slot (15-minute increments for efficiency)
    currentDate = new Date(currentDate.getTime() + 15 * 60 * 1000);
    
    // If we've moved past end of day, go to next day
    if (currentDate.getHours() >= endHour && currentDate.getMinutes() >= endMin) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
    }
  }
  
  return freeSlots;
}

/**
 * Create calendar event in Google Calendar
 */
export async function createCalendarEvent(
  config: CalendarConfig,
  summary: string,
  start: Date,
  end: Date
): Promise<string> {
  // Validate that event is within working hours
  const [startHour, startMin] = config.workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = config.workingHoursEnd.split(':').map(Number);
  
  const eventStartHour = start.getHours();
  const eventStartMin = start.getMinutes();
  const eventEndHour = end.getHours();
  const eventEndMin = end.getMinutes();
  
  // Check if event starts before working hours
  if (eventStartHour < startHour || (eventStartHour === startHour && eventStartMin < startMin)) {
    const error = `Event starts before working hours: ${eventStartHour}:${eventStartMin} (working hours: ${startHour}:${startMin})`;
    console.error('[EVENT]', error);
    throw new Error(error);
  }
  
  // Check if event ends after working hours
  if (eventEndHour > endHour || (eventEndHour === endHour && eventEndMin > endMin)) {
    const error = `Event ends after working hours: ${eventEndHour}:${eventEndMin} (working hours: ${endHour}:${endMin})`;
    console.error('[EVENT]', error);
    throw new Error(error);
  }
  
  console.log('[EVENT] Creating calendar event...');
  console.log('[EVENT] Summary:', summary);
  console.log('[EVENT] Start:', start.toISOString(), `(${eventStartHour}:${eventStartMin})`);
  console.log('[EVENT] End:', end.toISOString(), `(${eventEndHour}:${eventEndMin})`);
  console.log('[EVENT] Working hours:', `${startHour}:${startMin} - ${endHour}:${endMin}`);
  
  try {
    // Get user's timezone from the system or use UTC as fallback
    // The timezone should match the timezone of the dateTime
    // Since we're using ISO strings (UTC), we should use UTC timezone
    // OR convert the dates to the user's local timezone
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    
    // Convert dates to the specified timezone for proper display
    // Google Calendar API expects dateTime in RFC3339 format with timezone
    const startDateTime = new Date(start);
    const endDateTime = new Date(end);
    
    const eventData = {
      summary,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: timeZone,
      },
    };
    
    console.log('[EVENT] Using timezone:', timeZone);
    console.log('[EVENT] Start date (local):', startDateTime.toLocaleString());
    console.log('[EVENT] End date (local):', endDateTime.toLocaleString());
    
    console.log('[EVENT] Request body:', JSON.stringify(eventData, null, 2));
    console.log('[EVENT] API endpoint: https://www.googleapis.com/calendar/v3/calendars/primary/events');
    
    // Don't add X-Goog-User-Project header - let Google infer the project from the OAuth token
    // This avoids project mismatch issues
    const googleApiKey = process.env.GOOGLE_API_KEY;
    
    // Build URL with API key if available (optional)
    let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
    if (googleApiKey) {
      apiUrl += `?key=${encodeURIComponent(googleApiKey)}`;
    }
    
    // Build headers - NO X-Goog-User-Project header
    // Google will automatically infer the project from the OAuth token's audience
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData),
      }
    );
    
    console.log('[EVENT] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to create calendar event`;
      let errorDetails: any = {};
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
        errorDetails = errorJson.error || {};
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('Error creating calendar event:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        details: errorDetails,
        summary,
        start: start.toISOString(),
        end: end.toISOString()
      });
      
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    const event = await response.json();
    console.log('[EVENT] ✅ Event created successfully!');
    console.log('[EVENT] Event ID:', event.id);
    console.log('[EVENT] Event HTML Link:', event.htmlLink);
    console.log('[EVENT] Event Start:', event.start?.dateTime || event.start?.date);
    console.log('[EVENT] Event End:', event.end?.dateTime || event.end?.date);
    console.log('[EVENT] Event Timezone:', event.start?.timeZone);
    console.log('[EVENT] Event Summary:', event.summary);
    console.log('[EVENT] Event Status:', event.status);
    console.log('[EVENT] Full event data:', JSON.stringify(event, null, 2));
    
    // Verify the event was actually created by fetching it back
    try {
      // Get Google Cloud project ID and API key from environment (optional)
      const googleProjectId = getGoogleProjectId();
      const googleApiKey = process.env.GOOGLE_API_KEY;
      
      // Build URL with API key if available
      let verifyUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`;
      if (googleApiKey) {
        verifyUrl += `?key=${encodeURIComponent(googleApiKey)}`;
      }
      
      // Build headers - include X-Goog-User-Project only if we can determine it
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.accessToken}`,
      };
      
      // Only add X-Goog-User-Project if we have it (optional - Google can infer from token)
      if (googleProjectId) {
        headers['X-Goog-User-Project'] = googleProjectId;
      }
      
      const verifyResponse = await fetch(
        verifyUrl,
        {
          headers,
        }
      );
      
      if (verifyResponse.ok) {
        const verifiedEvent = await verifyResponse.json();
        console.log('[EVENT] ✅ Verification: Event exists in calendar');
        console.log('[EVENT] Verified event link:', verifiedEvent.htmlLink);
      } else {
        console.error('[EVENT] ⚠️ Verification failed: Event not found in calendar');
      }
    } catch (verifyError) {
      console.error('[EVENT] ⚠️ Verification error:', verifyError);
    }
    
    return event.id;
  } catch (error) {
    console.error('Error in createCalendarEvent:', error);
    throw error;
  }
}
