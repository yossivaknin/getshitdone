import { NextRequest, NextResponse } from 'next/server'
import { getBusySlots, findFreeSlots, CalendarConfig } from '@/lib/calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    const accessToken = searchParams.get('token')
    
    if (!date || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: date and token' },
        { status: 400 }
      )
    }
    
    // Parse the date
    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    
    // Set time range for that day (start of day to end of day)
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)
    
    // Get working hours from query params or defaults
    const workingHoursStart = searchParams.get('workingHoursStart') || '09:00'
    const workingHoursEnd = searchParams.get('workingHoursEnd') || '18:00'
    
    const config: CalendarConfig = {
      accessToken,
      workingHoursStart,
      workingHoursEnd
    }
    
    // Fetch busy slots
    console.log(`[DEBUG] Fetching busy slots for ${date}...`)
    const busySlots = await getBusySlots(config, dayStart, dayEnd)
    
    // Also fetch [Focus] events
    // Get Google Cloud project ID from environment or use default
    const googleProjectId = process.env.GOOGLE_PROJECT_ID || 'fast-asset-287619'
    
    let focusEventSlots: any[] = []
    try {
      const eventsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(dayStart.toISOString())}&` +
        `timeMax=${encodeURIComponent(dayEnd.toISOString())}&` +
        `maxResults=2500&` +
        `orderBy=startTime&` +
        `singleEvents=true&` +
        `q=[Focus]`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Goog-User-Project': googleProjectId, // Explicitly specify project for billing/quota
          },
        }
      )
      
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json()
        const focusEvents = eventsData.items || []
        focusEventSlots = focusEvents
          .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
          .map((event: any) => ({
            id: event.id,
            summary: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            startTime: new Date(event.start.dateTime).getTime(),
            endTime: new Date(event.end.dateTime).getTime()
          }))
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching Focus events:', error)
    }
    
    // Merge busy slots
    const allBusySlots = busySlots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      startTime: slot.start.getTime(),
      endTime: slot.end.getTime(),
      source: 'FreeBusy API'
    }))
    
    focusEventSlots.forEach(slot => {
      const key = `${slot.startTime}-${slot.endTime}`
      if (!allBusySlots.find(b => `${b.startTime}-${b.endTime}` === key)) {
        allBusySlots.push({
          start: slot.start,
          end: slot.end,
          startTime: slot.startTime,
          endTime: slot.endTime,
          source: '[Focus] event',
          summary: slot.summary
        })
      }
    })
    
    allBusySlots.sort((a, b) => a.startTime - b.startTime)
    
    // Find free slots for different durations
    const freeSlots30 = findFreeSlots(
      busySlots,
      dayStart,
      dayEnd,
      workingHoursStart,
      workingHoursEnd,
      30 // 30 minutes
    )
    
    const freeSlots60 = findFreeSlots(
      busySlots,
      dayStart,
      dayEnd,
      workingHoursStart,
      workingHoursEnd,
      60 // 60 minutes
    )
    
    return NextResponse.json({
      date,
      workingHours: {
        start: workingHoursStart,
        end: workingHoursEnd
      },
      busySlots: {
        fromFreeBusy: busySlots.length,
        fromFocusEvents: focusEventSlots.length,
        total: allBusySlots.length,
        slots: allBusySlots.map(slot => ({
          start: slot.start,
          end: slot.end,
          startLocal: new Date(slot.start).toLocaleString(),
          endLocal: new Date(slot.end).toLocaleString(),
          source: slot.source,
          summary: slot.summary || 'External meeting'
        }))
      },
      freeSlots: {
        '30min': freeSlots30.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          startLocal: slot.start.toLocaleString(),
          endLocal: slot.end.toLocaleString()
        })),
        '60min': freeSlots60.map(slot => ({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          startLocal: slot.start.toLocaleString(),
          endLocal: slot.end.toLocaleString()
        }))
      }
    })
  } catch (error: any) {
    console.error('[DEBUG] Error:', error)
    
    // Provide detailed error information
    let errorMessage = error.message || 'Failed to fetch slots'
    let errorDetails: any = {
      message: errorMessage,
      stack: error.stack
    }
    
    // If it's a 404 HTML error, provide specific guidance
    if (errorMessage.includes('404') || errorMessage.includes('HTML')) {
      errorDetails.suggestion = 'This 404 error usually means: 1) Calendar API not enabled, 2) Billing not enabled, 3) API in different project than OAuth credentials, or 4) API needs to be refreshed (disable/re-enable)'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    )
  }
}


