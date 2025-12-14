import { NextRequest, NextResponse } from 'next/server'
import { getGoogleProjectId } from '@/lib/calendar'

/**
 * Comprehensive diagnostic tool for Calendar API 404 errors
 * This will test multiple scenarios to identify the exact issue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing token' },
        { status: 400 }
      )
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        googleProjectId: getGoogleProjectId() || 'NOT FOUND (will be extracted from Client ID)',
        hasApiKey: !!process.env.GOOGLE_API_KEY,
        apiKeyPreview: process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 10)}...` : 'NOT SET',
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? `${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 30)}...` : 'NOT SET',
      },
      tokenInfo: null,
      tests: [],
      recommendations: []
    }

    // Step 1: Get token info (Client ID, scope, etc.)
    console.log('[DIAGNOSE] Step 1: Getting token info...')
    try {
      const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
      
      if (tokenInfoResponse.ok) {
        const tokenInfo = await tokenInfoResponse.json()
        diagnostics.tokenInfo = {
          success: true,
          expires_in: tokenInfo.expires_in,
          scope: tokenInfo.scope,
          audience: tokenInfo.audience, // This is the OAuth Client ID
          issued_to: tokenInfo.issued_to,
          user_id: tokenInfo.user_id,
          hasCalendarScope: tokenInfo.scope?.includes('calendar') || false,
        }
        
        console.log('[DIAGNOSE] Token info:', diagnostics.tokenInfo)
        
        // Extract project number from Client ID if possible
        // Client ID format: PROJECT_NUMBER-xxx.apps.googleusercontent.com
        if (tokenInfo.audience) {
          const clientIdParts = tokenInfo.audience.split('-')
          if (clientIdParts.length > 0) {
            diagnostics.tokenInfo.clientIdProjectNumber = clientIdParts[0]
          }
        }
      } else {
        const errorText = await tokenInfoResponse.text()
        diagnostics.tokenInfo = {
          success: false,
          status: tokenInfoResponse.status,
          error: errorText,
        }
        diagnostics.recommendations.push({
          severity: 'critical',
          issue: 'Token is invalid or expired',
          fix: 'Please reconnect Google Calendar in Settings to get a new token.',
        })
        return NextResponse.json({ success: false, diagnostics })
      }
    } catch (err: any) {
      diagnostics.tokenInfo = {
        success: false,
        error: err.message,
      }
      return NextResponse.json({ success: false, diagnostics })
    }

    // Step 2: Check if token has calendar scope
    if (!diagnostics.tokenInfo.hasCalendarScope) {
      diagnostics.recommendations.push({
        severity: 'critical',
        issue: 'Token does NOT have calendar scope',
        fix: 'You need to re-authenticate with Google to get a new token that includes calendar permissions. Go to Settings, disconnect Google Calendar, then reconnect it.',
      })
      return NextResponse.json({ success: false, diagnostics })
    }

    // Step 3: Test Calendar API with different configurations
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const requestBody = {
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      items: [{ id: 'primary' }],
    }

    // Test 1: With X-Goog-User-Project header (if available)
    console.log('[DIAGNOSE] Test 1: With X-Goog-User-Project header (if available)...')
    const googleProjectId = getGoogleProjectId()
    const googleApiKey = process.env.GOOGLE_API_KEY
    
    let apiUrl = `https://www.googleapis.com/calendar/v3/freeBusy`
    if (googleApiKey) {
      apiUrl += `?key=${encodeURIComponent(googleApiKey)}`
    }

    // Build headers - include X-Goog-User-Project only if we can determine it
    const test1Headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    
    // Only add X-Goog-User-Project if we have it (optional - Google can infer from token)
    if (googleProjectId) {
      test1Headers['X-Goog-User-Project'] = googleProjectId;
    }

    const test1Response = await fetch(apiUrl, {
      method: 'POST',
      headers: test1Headers,
      body: JSON.stringify(requestBody),
    })

    const test1Text = await test1Response.text()
    const test1IsHtml = test1Text.includes('<!DOCTYPE html>') || test1Text.includes('<html')

    diagnostics.tests.push({
      name: 'Test 1: With X-Goog-User-Project header',
      config: {
        projectId: googleProjectId,
        hasApiKey: !!googleApiKey,
        url: apiUrl,
      },
      status: test1Response.status,
      success: test1Response.ok,
      isHtml: test1IsHtml,
      errorPreview: test1Text.substring(0, 500),
    })

    // Test 2: Without X-Goog-User-Project header (let Google infer from token)
    console.log('[DIAGNOSE] Test 2: Without X-Goog-User-Project header...')
    const test2Response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // No X-Goog-User-Project header
      },
      body: JSON.stringify(requestBody),
    })

    const test2Text = await test2Response.text()
    const test2IsHtml = test2Text.includes('<!DOCTYPE html>') || test2Text.includes('<html')

    diagnostics.tests.push({
      name: 'Test 2: Without X-Goog-User-Project header',
      config: {
        projectId: 'none (inferred from token)',
        hasApiKey: !!googleApiKey,
        url: apiUrl,
      },
      status: test2Response.status,
      success: test2Response.ok,
      isHtml: test2IsHtml,
      errorPreview: test2Text.substring(0, 500),
    })

    // Test 3: Try using the project number from the Client ID
    if (diagnostics.tokenInfo.clientIdProjectNumber) {
      console.log('[DIAGNOSE] Test 3: With project number from Client ID...')
      const test3Response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Goog-User-Project': diagnostics.tokenInfo.clientIdProjectNumber,
        },
        body: JSON.stringify(requestBody),
      })

      const test3Text = await test3Response.text()
      const test3IsHtml = test3Text.includes('<!DOCTYPE html>') || test3Text.includes('<html')

      diagnostics.tests.push({
        name: 'Test 3: With project number from Client ID',
        config: {
          projectId: diagnostics.tokenInfo.clientIdProjectNumber,
          hasApiKey: !!googleApiKey,
          url: apiUrl,
        },
        status: test3Response.status,
        success: test3Response.ok,
        isHtml: test3IsHtml,
        errorPreview: test3Text.substring(0, 500),
      })
    }

    // Analyze results and provide recommendations
    const successfulTest = diagnostics.tests.find((t: any) => t.success)
    if (successfulTest) {
      diagnostics.recommendations.push({
        severity: 'info',
        issue: `Test "${successfulTest.name}" succeeded!`,
        fix: `Use this configuration: Project ID = ${successfulTest.config.projectId}`,
      })
    } else {
      // All tests failed - provide specific guidance
      if (diagnostics.tests.every((t: any) => t.isHtml && t.status === 404)) {
        diagnostics.recommendations.push({
          severity: 'critical',
          issue: 'All tests returned 404 HTML - Calendar API is not accessible',
          fix: `This means:
1. Calendar API is NOT enabled in your Google Cloud project
2. Your token may not have the calendar scope (try reconnecting)
3. There's a billing/quota issue

Your OAuth Client ID: ${diagnostics.tokenInfo.audience}
${googleProjectId ? `Detected Project ID: ${googleProjectId}` : 'Project ID: Will be inferred from OAuth token'}

ACTION REQUIRED:
1. Enable Calendar API: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
2. Verify your token has calendar scope (disconnect and reconnect in Settings)
3. Check billing: https://console.cloud.google.com/billing`,
        })
      } else if (diagnostics.tests.some((t: any) => t.status === 403)) {
        diagnostics.recommendations.push({
          severity: 'critical',
          issue: 'Got 403 Forbidden - Permission denied',
          fix: `This usually means:
1. Token doesn't have calendar scope (but we verified it does)
2. Calendar API is not enabled
3. Billing/quota restrictions
4. Organization policies blocking access

Check: https://console.cloud.google.com/apis/api/calendar-json.googleapis.com/overview`,
        })
      } else if (diagnostics.tests.some((t: any) => t.status === 401)) {
        diagnostics.recommendations.push({
          severity: 'critical',
          issue: 'Got 401 Unauthorized - Token expired',
          fix: 'Your access token has expired. Please reconnect Google Calendar in Settings.',
        })
      }
    }

    // Note: Project ID is optional - Google can infer it from the OAuth token
    // Only show info if project ID is explicitly set and differs from Client ID project
    if (googleProjectId && diagnostics.tokenInfo.clientIdProjectNumber && googleProjectId !== diagnostics.tokenInfo.clientIdProjectNumber) {
      diagnostics.recommendations.push({
        severity: 'info',
        issue: 'Project ID differs from Client ID project',
        fix: `Your OAuth Client ID belongs to project "${diagnostics.tokenInfo.clientIdProjectNumber}" but GOOGLE_PROJECT_ID is set to "${googleProjectId}". This is optional - Google will infer the project from your OAuth token if the header is not included.`,
      })
    }

    return NextResponse.json({
      success: !!successfulTest,
      diagnostics,
    })
  } catch (error: any) {
    console.error('[DIAGNOSE] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Diagnostic failed',
      },
      { status: 500 }
    )
  }
}

