'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DiagnoseCalendarPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      // Get token from localStorage
      const token = localStorage.getItem('google_calendar_token')
      
      if (!token) {
        setError('No token found in localStorage. Please connect Google Calendar first.')
        setLoading(false)
        return
      }

      const diagnostics: any = {
        token: {
          found: !!token,
          length: token?.length || 0,
          preview: token?.substring(0, 30) + '...',
          startsWith: token?.substring(0, 5),
        },
        tokenInfo: null,
        apiTest: null,
        recommendations: []
      }

      // Step 1: Check token info (scope, audience, etc.)
      try {
        console.log('[DIAGNOSE] Step 1: Checking token info...')
        const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
        
        if (tokenInfoResponse.ok) {
          const tokenInfo = await tokenInfoResponse.json()
          diagnostics.tokenInfo = {
            success: true,
            expires_in: tokenInfo.expires_in,
            scope: tokenInfo.scope,
            audience: tokenInfo.audience, // This is the Client ID
            issued_to: tokenInfo.issued_to,
            user_id: tokenInfo.user_id,
            hasCalendarScope: tokenInfo.scope?.includes('calendar') || false,
          }
          
          console.log('[DIAGNOSE] Token info:', diagnostics.tokenInfo)
          
          // Check if token has calendar scope
          if (!diagnostics.tokenInfo.hasCalendarScope) {
            diagnostics.recommendations.push({
              severity: 'critical',
              issue: 'Token does NOT have calendar scope',
              fix: 'You need to re-authenticate with Google to get a new token that includes calendar permissions. Go to Settings, disconnect Google Calendar, then reconnect it.',
            })
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
        }
      } catch (err: any) {
        diagnostics.tokenInfo = {
          success: false,
          error: err.message,
        }
      }

      // Step 2: Run comprehensive Calendar API diagnostics
      if (diagnostics.tokenInfo?.success && diagnostics.tokenInfo.hasCalendarScope) {
        try {
          console.log('[DIAGNOSE] Step 2: Running comprehensive Calendar API diagnostics...')
          
          // Use the new comprehensive diagnostic API
          const diagnosticResponse = await fetch('/api/diagnose-calendar-404', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token,
            }),
          })

          const diagnosticData = await diagnosticResponse.json()
          
          // Merge the comprehensive diagnostics
          if (diagnosticData.diagnostics) {
            diagnostics.environment = diagnosticData.diagnostics.environment
            diagnostics.tests = diagnosticData.diagnostics.tests || []
            
            // Add recommendations from the diagnostic API
            if (diagnosticData.diagnostics.recommendations) {
              diagnostics.recommendations.push(...diagnosticData.diagnostics.recommendations)
            }
            
            diagnostics.apiTest = {
              success: diagnosticData.success,
              comprehensive: true,
            }
          } else {
            diagnostics.apiTest = diagnosticData
          }
        } catch (err: any) {
          console.error('[DIAGNOSE] Error running comprehensive diagnostics:', err)
          diagnostics.apiTest = {
            success: false,
            error: err.message,
          }
        }
      }

      setResults(diagnostics)
    } catch (err: any) {
      setError(err.message || 'Diagnostics failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Google Calendar Diagnostics</h1>
        
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <p className="text-gray-600 mb-4">
            This diagnostic tool will check your Google Calendar token, verify its scope, and test the API connection.
          </p>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Token Info */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Token Status</h2>
              <div className="space-y-2">
                <p><strong>Found:</strong> {results.token.found ? '✅ Yes' : '❌ No'}</p>
                <p><strong>Length:</strong> {results.token.length}</p>
                <p><strong>Preview:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{results.token.preview}</code></p>
              </div>
            </div>

            {/* Token Info from Google */}
            {results.tokenInfo && (
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Token Information (from Google)</h2>
                {results.tokenInfo.success ? (
                  <div className="space-y-2">
                    <p><strong>Status:</strong> ✅ Valid</p>
                    <p><strong>Expires in:</strong> {results.tokenInfo.expires_in} seconds</p>
                    <p><strong>Has Calendar Scope:</strong> {results.tokenInfo.hasCalendarScope ? '✅ Yes' : '❌ NO - THIS IS THE PROBLEM!'}</p>
                    <p><strong>Scope:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{results.tokenInfo.scope}</code></p>
                    <p><strong>OAuth Client ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{results.tokenInfo.audience}</code></p>
                    <p><strong>User ID:</strong> {results.tokenInfo.user_id}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p><strong>Status:</strong> ❌ Invalid or Expired</p>
                    <p><strong>Error:</strong> {results.tokenInfo.error || results.tokenInfo.status}</p>
                  </div>
                )}
              </div>
            )}

            {/* Environment Configuration */}
            {results.environment && (
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Environment Configuration</h2>
                <div className="space-y-2">
                  <p><strong>Project ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">{results.environment.googleProjectId}</code></p>
                  <p><strong>API Key:</strong> {results.environment.hasApiKey ? `✅ Set (${results.environment.apiKeyPreview})` : '❌ NOT SET'}</p>
                  <p><strong>Client ID:</strong> {results.environment.clientId}</p>
                </div>
              </div>
            )}

            {/* API Tests */}
            {results.tests && results.tests.length > 0 && (
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Calendar API Tests</h2>
                <div className="space-y-4">
                  {results.tests.map((test: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded border ${
                        test.success
                          ? 'bg-green-50 border-green-200'
                          : test.isHtml
                          ? 'bg-red-50 border-red-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <p className="font-semibold">{test.name}</p>
                      <p className="text-sm mt-1">
                        <strong>Status:</strong> {test.status} {test.success ? '✅' : '❌'}
                      </p>
                      <p className="text-sm">
                        <strong>Config:</strong> Project ID = {test.config.projectId}, API Key = {test.config.hasApiKey ? 'Yes' : 'No'}
                      </p>
                      {!test.success && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">Error Details</summary>
                          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-2">{test.errorPreview}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Test (Legacy) */}
            {results.apiTest && !results.apiTest.comprehensive && (
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Calendar API Test</h2>
                {results.apiTest.success ? (
                  <div className="space-y-2">
                    <p><strong>Status:</strong> ✅ API is working!</p>
                    <p><strong>Response:</strong> <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(results.apiTest.data, null, 2)}</pre></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p><strong>Status:</strong> ❌ API test failed</p>
                    <p><strong>Error:</strong> {results.apiTest.error}</p>
                    {results.apiTest.suggestion && (
                      <p><strong>Suggestion:</strong> {results.apiTest.suggestion}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                <div className="space-y-4">
                  {results.recommendations.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded ${
                        rec.severity === 'critical'
                          ? 'bg-red-50 border border-red-200'
                          : rec.severity === 'warning'
                          ? 'bg-yellow-50 border border-yellow-200'
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <p className="font-semibold">{rec.issue}</p>
                      <p className="text-sm mt-2">{rec.fix}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


