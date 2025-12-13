import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, requestBody } = body

    if (!token || !requestBody) {
      return NextResponse.json(
        { success: false, error: 'Missing token or requestBody' },
        { status: 400 }
      )
    }

    // Get Google Cloud project ID and API key from environment (optional)
    const { getGoogleProjectId } = await import('@/lib/calendar')
    const googleProjectId = getGoogleProjectId()
    const googleApiKey = process.env.GOOGLE_API_KEY

    // Build URL with API key if available
    let apiUrl = `https://www.googleapis.com/calendar/v3/freebusy`
    if (googleApiKey) {
      apiUrl += `?key=${encodeURIComponent(googleApiKey)}`
    }

    console.log('[TEST API] Testing Calendar API with:')
    console.log('[TEST API] Project ID:', googleProjectId || 'Not set (Google will infer from token)')
    console.log('[TEST API] Has API Key:', !!googleApiKey)
    console.log('[TEST API] URL:', apiUrl)

    // Build headers - include X-Goog-User-Project only if we can determine it
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Only add X-Goog-User-Project if we have it (optional - Google can infer from token)
    if (googleProjectId) {
      headers['X-Goog-User-Project'] = googleProjectId;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    console.log('[TEST API] Response status:', response.status)
    console.log('[TEST API] Response headers:', Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log('[TEST API] Response preview (first 500 chars):', responseText.substring(0, 500))

    if (!response.ok) {
      // Check if it's an HTML 404
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        return NextResponse.json({
          success: false,
          error: 'Calendar API returned 404 HTML page',
          status: response.status,
          suggestion: `This 404 error means Google can't find the Calendar API endpoint. This usually happens when:
1. Calendar API is NOT enabled in your Google Cloud project
2. Your token doesn't have the calendar scope (try reconnecting)
3. There's a billing/quota issue

Please check:
- Enable Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
- Verify your token has calendar scope (disconnect and reconnect in Settings)
- Check billing: https://console.cloud.google.com/billing`,
        })
      }

      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(responseText)
        return NextResponse.json({
          success: false,
          error: errorJson.error?.message || 'Calendar API error',
          status: response.status,
          details: errorJson.error,
        })
      } catch {
        return NextResponse.json({
          success: false,
          error: `Calendar API returned ${response.status}`,
          status: response.status,
          responsePreview: responseText.substring(0, 200),
        })
      }
    }

    // Success!
    const data = JSON.parse(responseText)
    return NextResponse.json({
      success: true,
      data: {
        calendars: data.calendars,
        kind: data.kind,
      },
    })
  } catch (error: any) {
    console.error('[TEST API] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Test failed',
      },
      { status: 500 }
    )
  }
}


