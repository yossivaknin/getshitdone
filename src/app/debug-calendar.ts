'use server'

import { CalendarConfig } from '@/lib/calendar';

export async function listCalendarEvents(accessToken: string, maxResults: number = 10) {
  if (!accessToken) {
    return {
      success: false,
      message: 'No access token provided'
    };
  }

  try {
    const now = new Date();
    const timeMin = now.toISOString();
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ahead
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `maxResults=${maxResults}&` +
      `orderBy=startTime&` +
      `singleEvents=true&` +
      `q=[Focus]`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        message: `Failed to fetch events: ${errorText}`
      };
    }

    const data = await response.json();
    const events = data.items || [];
    
    console.log(`[DEBUG] Found ${events.length} events with "[Focus]" in the next 30 days`);
    
    return {
      success: true,
      events: events.map((event: any) => ({
        id: event.id,
        summary: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        htmlLink: event.htmlLink,
        status: event.status,
        timeZone: event.start?.timeZone
      })),
      message: `Found ${events.length} event(s)`
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to list events'
    };
  }
}

