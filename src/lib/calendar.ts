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
    console.log('[CALENDAR] API endpoint: https://www.googleapis.com/calendar/v3/freeBusy');
    console.log('[CALENDAR] Token preview:', config.accessToken.substring(0, 20) + '...');
    
    // Don't add X-Goog-User-Project header - let Google infer the project from the OAuth token
    // The Calendar list API works without this header, so FreeBusy should too
    // Adding the wrong project ID causes 404 errors
    
    // Build URL - NOTE: endpoint is case-sensitive: /freeBusy (capital B), not /freebusy
    // Don't append API key when using OAuth token - it's not needed and can complicate debugging
    const apiUrl = `https://www.googleapis.com/calendar/v3/freeBusy`;
    
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
  
  // Get user's timezone - default to America/New_York (NY timezone)
  // This is critical because the server might be in UTC, but we need to work in user's timezone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  
  // Helper to get local time components in user's timezone
  const getLocalTime = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    return {
      year: parseInt(parts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1,
      day: parseInt(parts.find(p => p.type === 'day')?.value || '0'),
      hour: parseInt(parts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(parts.find(p => p.type === 'minute')?.value || '0')
    };
  };
  
  // Helper to create a date in user's timezone with specific hour/minute
  // This properly converts from user's local time to UTC for the Date object
  const createDateInUserTimezone = (baseDate: Date, hour: number, minute: number): Date => {
    const local = getLocalTime(baseDate);
    // Create a date string representing the time in the user's timezone
    const dateStr = `${local.year}-${String(local.month + 1).padStart(2, '0')}-${String(local.day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    
    // Create a date object - JavaScript will interpret this as local server time
    // We need to convert it to represent the correct UTC time for the user's timezone
    // Method: Create a date in UTC that represents the same moment in user's timezone
    const tempDate = new Date(dateStr);
    
    // Get the timezone offset for the user's timezone at this date
    // We'll use a trick: format the date in both UTC and user's timezone to get the offset
    const utcStr = tempDate.toLocaleString('en-US', { timeZone: 'UTC', hour12: false });
    const tzStr = tempDate.toLocaleString('en-US', { timeZone: timeZone, hour12: false });
    
    // Parse both to get the offset
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    const offset = utcDate.getTime() - tzDate.getTime();
    
    // Apply the offset to get the correct UTC time
    return new Date(tempDate.getTime() - offset);
  };
  
  // Start from NOW or timeMin, whichever is later (don't schedule in the past!)
  const now = new Date();
  const startFrom = timeMin > now ? timeMin : now;
  let currentDate = new Date(startFrom);
  
  // Get local time components for comparison
  const nowLocal = getLocalTime(now);
  const currentLocal = getLocalTime(currentDate);
  
  // ALWAYS ensure we start at working hours, regardless of input time
  // If we're starting today, set to working hours start, but don't go back in time
  if (currentLocal.year === nowLocal.year && 
      currentLocal.month === nowLocal.month && 
      currentLocal.day === nowLocal.day) {
    // Today - start from now or working hours start, whichever is later
    const todayStart = createDateInUserTimezone(currentDate, startHour, startMin);
    currentDate = todayStart > now ? todayStart : now;
    
    // Get current local time after adjustment
    const currentLocalAfter = getLocalTime(currentDate);
    
    // Round up to next 15 minutes in local time
    let roundedMinutes = Math.ceil(currentLocalAfter.minute / 15) * 15;
    let roundedHour = currentLocalAfter.hour;
    if (roundedMinutes >= 60) {
      roundedMinutes = 0;
      roundedHour += 1;
    }
    currentDate = createDateInUserTimezone(currentDate, roundedHour, roundedMinutes);
    
    // CRITICAL: Check in local time if rounded time is still before working hours start
    const finalLocal = getLocalTime(currentDate);
    if (finalLocal.hour < startHour || (finalLocal.hour === startHour && finalLocal.minute < startMin)) {
      currentDate = createDateInUserTimezone(currentDate, startHour, startMin);
    }
    
    // CRITICAL: Check in local time if current time is after working hours end
    const finalLocalAfter = getLocalTime(currentDate);
    if (finalLocalAfter.hour > endHour || (finalLocalAfter.hour === endHour && finalLocalAfter.minute >= endMin)) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      currentDate = createDateInUserTimezone(nextDay, startHour, startMin);
    }
  } else {
    // Future date - ALWAYS start from working hours start in user's timezone
    currentDate = createDateInUserTimezone(currentDate, startHour, startMin);
  }
  
  const endDate = createDateInUserTimezone(timeMax, endHour, endMin);
  
  console.log('[FREESLOTS] ========== FINDING FREE SLOTS ==========');
  console.log('[FREESLOTS] Working hours (from parameters):', `${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}`);
  console.log('[FREESLOTS] User timezone:', timeZone);
  console.log('[FREESLOTS] Searching from:', currentDate.toISOString(), 'to', endDate.toISOString());
  const startLocal = getLocalTime(currentDate);
  const endLocal = getLocalTime(endDate);
  console.log('[FREESLOTS] Search range (local time):', `${startLocal.year}-${String(startLocal.month + 1).padStart(2, '0')}-${String(startLocal.day).padStart(2, '0')} ${startLocal.hour}:${startLocal.minute.toString().padStart(2, '0')}`,
    'to', `${endLocal.year}-${String(endLocal.month + 1).padStart(2, '0')}-${String(endLocal.day).padStart(2, '0')} ${endLocal.hour}:${endLocal.minute.toString().padStart(2, '0')}`);
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
    // CRITICAL: Always ensure we're starting at the beginning of working hours for this day
    // Use user's timezone for all comparisons
    const currentLocal = getLocalTime(currentDate);
    const dayStart = createDateInUserTimezone(currentDate, startHour, startMin);
    const dayEnd = createDateInUserTimezone(currentDate, endHour, endMin);
    
    // If current time is before working hours start, move to start
    if (currentLocal.hour < startHour || (currentLocal.hour === startHour && currentLocal.minute < startMin)) {
      currentDate = dayStart;
      console.log(`[FREESLOTS] Adjusted to working hours start: ${currentDate.toISOString()} (${timeZone})`);
    }
    
    // If current time is after working hours end, move to next day
    if (currentLocal.hour > endHour || (currentLocal.hour === endHour && currentLocal.minute >= endMin)) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      currentDate = createDateInUserTimezone(nextDay, startHour, startMin);
      daysChecked++;
      console.log(`[FREESLOTS] Moved to next day's working hours start: ${currentDate.toISOString()} (${timeZone})`);
      continue;
    }
    
    // Calculate slot end
    const slotEnd = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);
    
    // STRICT CHECK: Slot must be completely within working hours (check in user's timezone)
    const slotStartLocal = getLocalTime(currentDate);
    const slotEndLocal = getLocalTime(slotEnd);
    
    // Check if slot starts before working hours (shouldn't happen after above check, but be safe)
    if (slotStartLocal.hour < startHour || (slotStartLocal.hour === startHour && slotStartLocal.minute < startMin)) {
      currentDate = dayStart;
      continue;
    }
    
    // Check if slot ends after working hours - if so, move to next day
    if (slotEndLocal.hour > endHour || (slotEndLocal.hour === endHour && slotEndLocal.minute > endMin)) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      currentDate = createDateInUserTimezone(nextDay, startHour, startMin);
      daysChecked++;
      continue;
    }
    
    // Final validation: ensure slot is within the day's working hours
    const slotEndLocalCheck = getLocalTime(slotEnd);
    if (slotEndLocalCheck.hour > endHour || (slotEndLocalCheck.hour === endHour && slotEndLocalCheck.minute > endMin)) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      currentDate = createDateInUserTimezone(nextDay, startHour, startMin);
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
      // CRITICAL: Double-check that the slot is within working hours (in user's timezone)
      const finalStartLocal = getLocalTime(currentDate);
      const finalEndLocal = getLocalTime(slotEnd);
      
      // Strict validation: slot must be completely within working hours
      const isValidStart = finalStartLocal.hour > startHour || 
        (finalStartLocal.hour === startHour && finalStartLocal.minute >= startMin);
      const isValidEnd = finalEndLocal.hour < endHour || 
        (finalEndLocal.hour === endHour && finalEndLocal.minute <= endMin);
      
      // Additional check: ensure slot doesn't span across working hours boundary
      const slotStartTime = finalStartLocal.hour * 60 + finalStartLocal.minute;
      const slotEndTime = finalEndLocal.hour * 60 + finalEndLocal.minute;
      const workingStartTime = startHour * 60 + startMin;
      const workingEndTime = endHour * 60 + endMin;
      
      const isWithinWorkingHours = slotStartTime >= workingStartTime && slotEndTime <= workingEndTime;
      
      if (isValidStart && isValidEnd && isWithinWorkingHours) {
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
        
        console.log(`[FREESLOTS] ✅ Found valid slot #${freeSlots.length + 1}:`);
        console.log(`[FREESLOTS]   UTC: ${new Date(currentDate).toISOString()} to ${slotEnd.toISOString()}`);
        console.log(`[FREESLOTS]   Local (${timeZone}): ${finalStartLocal.hour}:${finalStartLocal.minute.toString().padStart(2, '0')} - ${finalEndLocal.hour}:${finalEndLocal.minute.toString().padStart(2, '0')}`);
        console.log(`[FREESLOTS]   Duration: ${durationMinutes} minutes`);
        console.log(`[FREESLOTS]   ✅ Verified: No conflicts with ${sortedBusy.length} busy slots`);
        
        // If we found enough slots, we can return early
        // For now, let's find at least one good slot
        if (freeSlots.length >= 1) {
          break;
        }
      } else {
        console.warn(`[FREESLOTS] ❌ Slot rejected - outside working hours:`, {
          start: `${finalStartLocal.hour}:${finalStartLocal.minute}`,
          end: `${finalEndLocal.hour}:${finalEndLocal.minute}`,
          workingHours: `${startHour}:${startMin} - ${endHour}:${endMin}`,
          timezone: timeZone,
          isWithinWorkingHours: isWithinWorkingHours
        });
        // If slot is outside working hours, move to next day's start instead of incrementing
        if (!isWithinWorkingHours) {
          currentDate.setDate(currentDate.getDate() + 1);
          currentDate.setHours(startHour, startMin, 0, 0);
          currentDate.setMinutes(0, 0, 0);
          daysChecked++;
          continue;
        }
      }
    }
    
    // Move to next potential slot (15-minute increments for efficiency)
    // But ensure we don't go past working hours
    const nextSlot = new Date(currentDate.getTime() + 15 * 60 * 1000);
    const nextSlotHour = nextSlot.getHours();
    const nextSlotMin = nextSlot.getMinutes();
    const nextSlotTime = nextSlotHour * 60 + nextSlotMin;
    const workingEndTime = endHour * 60 + endMin;
    
    if (nextSlotTime > workingEndTime || nextSlot.getDate() !== currentDate.getDate()) {
      // Move to next day's start
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      currentDate.setMinutes(0, 0, 0);
      daysChecked++;
    } else {
      currentDate = nextSlot;
    }
    
    // If we've moved past end of day, go to next day
    if (currentDate.getHours() >= endHour && currentDate.getMinutes() >= endMin) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
    }
  }
  
  console.log('[FREESLOTS] ========== FREE SLOTS SUMMARY ==========');
  console.log(`[FREESLOTS] Total free slots found: ${freeSlots.length}`);
  if (freeSlots.length > 0) {
    console.log('[FREESLOTS] All available slots:');
    freeSlots.forEach((slot, idx) => {
      const slotStartLocal = getLocalTime(slot.start);
      const slotEndLocal = getLocalTime(slot.end);
      console.log(`[FREESLOTS]   Slot ${idx + 1}:`);
      console.log(`[FREESLOTS]     UTC: ${slot.start.toISOString()} to ${slot.end.toISOString()}`);
      console.log(`[FREESLOTS]     Local (${timeZone}): ${slotStartLocal.year}-${String(slotStartLocal.month + 1).padStart(2, '0')}-${String(slotStartLocal.day).padStart(2, '0')} ${slotStartLocal.hour}:${slotStartLocal.minute.toString().padStart(2, '0')} - ${slotEndLocal.hour}:${slotEndLocal.minute.toString().padStart(2, '0')}`);
      console.log(`[FREESLOTS]     Duration: ${Math.round((slot.end.getTime() - slot.start.getTime()) / (1000 * 60))} minutes`);
    });
  } else {
    console.warn('[FREESLOTS] ⚠️ NO FREE SLOTS FOUND!');
    console.warn('[FREESLOTS] This might mean:');
    console.warn('[FREESLOTS]   1. Calendar is completely booked');
    console.warn('[FREESLOTS]   2. Working hours are too restrictive');
    console.warn('[FREESLOTS]   3. Time range is too short');
  }
  console.log('[FREESLOTS] ========================================');
  
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
  
  // Get user's timezone - this is critical for proper time handling
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  
  // Convert dates to the user's local timezone for validation
  // Create formatters to get local time components
  const startFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const endFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Get local time components in the user's timezone
  const startParts = startFormatter.formatToParts(start);
  const endParts = endFormatter.formatToParts(end);
  
  const eventStartHour = parseInt(startParts.find(p => p.type === 'hour')?.value || '0');
  const eventStartMin = parseInt(startParts.find(p => p.type === 'minute')?.value || '0');
  const eventEndHour = parseInt(endParts.find(p => p.type === 'hour')?.value || '0');
  const eventEndMin = parseInt(endParts.find(p => p.type === 'minute')?.value || '0');
  
  console.log('[EVENT] Timezone:', timeZone);
  console.log('[EVENT] Start (local):', `${eventStartHour}:${eventStartMin.toString().padStart(2, '0')}`);
  console.log('[EVENT] End (local):', `${eventEndHour}:${eventEndMin.toString().padStart(2, '0')}`);
  console.log('[EVENT] Working hours:', `${startHour}:${startMin.toString().padStart(2, '0')} - ${endHour}:${endMin.toString().padStart(2, '0')}`);
  
  // Check if event starts before working hours
  if (eventStartHour < startHour || (eventStartHour === startHour && eventStartMin < startMin)) {
    const error = `Event starts before working hours: ${eventStartHour}:${eventStartMin.toString().padStart(2, '0')} (working hours: ${startHour}:${startMin.toString().padStart(2, '0')})`;
    console.error('[EVENT]', error);
    throw new Error(error);
  }
  
  // Check if event ends after working hours
  if (eventEndHour > endHour || (eventEndHour === endHour && eventEndMin > endMin)) {
    const error = `Event ends after working hours: ${eventEndHour}:${eventEndMin.toString().padStart(2, '0')} (working hours: ${endHour}:${endMin.toString().padStart(2, '0')})`;
    console.error('[EVENT]', error);
    throw new Error(error);
  }
  
  console.log('[EVENT] Creating calendar event...');
  console.log('[EVENT] Summary:', summary);
  console.log('[EVENT] Start (UTC):', start.toISOString());
  console.log('[EVENT] End (UTC):', end.toISOString());
  
  try {
    // Google Calendar API expects dateTime in RFC3339 format with timezone
    // The dateTime should be in ISO format (UTC), but we specify the timezone
    // so Google knows how to interpret it
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
    // Don't append API key - it's not needed with OAuth tokens and causes "different projects" errors
    // Google will automatically infer the project from the OAuth token's audience
    const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
    
    // Build headers - NO X-Goog-User-Project header, NO API key
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
      // Don't append API key - it's not needed with OAuth tokens and causes "different projects" errors
      // Google will automatically infer the project from the OAuth token's audience
      const verifyUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`;
      
      // Build headers - NO X-Goog-User-Project header, NO API key
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.accessToken}`,
      };
      
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
