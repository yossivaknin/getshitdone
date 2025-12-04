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
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      console.error('Error fetching busy slots:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      });
      
      // Don't throw - return empty array so scheduling can still attempt
      return [];
    }

    const data = await response.json();
    console.log('[CALENDAR] Response data:', JSON.stringify(data, null, 2));
    
    const busySlots: TimeSlot[] = [];

    if (data.calendars?.primary?.busy) {
      console.log('[CALENDAR] Found', data.calendars.primary.busy.length, 'busy periods');
      for (const busy of data.calendars.primary.busy) {
        busySlots.push({
          start: new Date(busy.start),
          end: new Date(busy.end),
        });
        console.log('[CALENDAR] Busy slot:', busy.start, 'to', busy.end);
      }
    } else {
      console.log('[CALENDAR] No busy periods found in response');
    }

    console.log(`[CALENDAR] Total busy slots: ${busySlots.length}`);
    return busySlots;
  } catch (error) {
    console.error('Error in getBusySlots:', error);
    // Return empty array on error so scheduling can still attempt
    return [];
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
  
  // Sort busy slots by start time
  const sortedBusy = [...busySlots].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  // Search for free slots over the next 7 days
  const maxDays = 7;
  let daysChecked = 0;
  
  while (currentDate < endDate && daysChecked < maxDays) {
    const slotEnd = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);
    
    // Check if slot start is within working hours
    const slotStartHour = currentDate.getHours();
    const slotStartMin = currentDate.getMinutes();
    const slotEndHour = slotEnd.getHours();
    const slotEndMin = slotEnd.getMinutes();
    
    // Check if slot starts before working hours
    if (slotStartHour < startHour || (slotStartHour === startHour && slotStartMin < startMin)) {
      // Move to start of working hours today
      currentDate.setHours(startHour, startMin, 0, 0);
      continue;
    }
    
    // Check if slot ends after working hours
    if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(startHour, startMin, 0, 0);
      daysChecked++;
      continue;
    }
    
    // Check if slot conflicts with busy slots
    const hasConflict = sortedBusy.some(busy => {
      return (
        (currentDate >= busy.start && currentDate < busy.end) ||
        (slotEnd > busy.start && slotEnd <= busy.end) ||
        (currentDate <= busy.start && slotEnd >= busy.end)
      );
    });
    
    if (!hasConflict && slotEnd <= endDate) {
      freeSlots.push({
        start: new Date(currentDate),
        end: slotEnd
      });
      
      // If we found enough slots, we can return early
      // For now, let's find at least one good slot
      if (freeSlots.length >= 1) {
        break;
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
  console.log('[EVENT] Creating calendar event...');
  console.log('[EVENT] Summary:', summary);
  console.log('[EVENT] Start:', start.toISOString());
  console.log('[EVENT] End:', end.toISOString());
  
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
