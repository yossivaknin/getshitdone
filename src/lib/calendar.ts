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
 * Query Google Calendar for busy slots between two dates
 */
export async function getBusySlots(
  config: CalendarConfig,
  timeMin: Date,
  timeMax: Date
): Promise<TimeSlot[]> {
  console.log('[CALENDAR] Fetching busy slots...');
  console.log('[CALENDAR] Time range:', timeMin.toISOString(), 'to', timeMax.toISOString());
  
  try {
    const requestBody = {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    };
    
    console.log('[CALENDAR] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/freebusy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );
    
    console.log('[CALENDAR] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to fetch busy slots';
      let errorDetails: any = {};
      
      // Check if we got an HTML response (404 page) - this usually means API isn't enabled
      if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
        console.error('[CALENDAR] ❌ Got HTML 404 response - Calendar API likely not enabled');
        throw new Error(`Google Calendar API returned 404. The Calendar API may not be enabled in your Google Cloud project. Please enable it at: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com`);
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
        throw new Error(`Google Calendar API endpoint not found (404). Please verify that the Calendar API is enabled in your Google Cloud Console: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com`);
      } else if (response.status === 403) {
        throw new Error(`Google Calendar API access denied (403). Please check that your OAuth token has the calendar scope and that the Calendar API is enabled.`);
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
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
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
      const verifyResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
        {
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
          },
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
