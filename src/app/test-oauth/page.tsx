'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from 'lucide-react'

export default function TestOAuthPage() {
  const [loading, setLoading] = useState(true)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  const fetchDiagnostics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/test-oauth')
      const data = await response.json()
      setDiagnostics(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch diagnostics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-600" />
          <p className="text-gray-600">Running diagnostics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] p-8">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!diagnostics) {
    return null
  }

  const { issues, warnings, success, redirectUris, summary, calendarOAuthUrl } = diagnostics

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">OAuth Configuration Diagnostics</h1>
          <Button onClick={fetchDiagnostics} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Summary */}
        <div className={`mb-6 p-4 rounded-md border-2 ${
          summary.status === 'OK' ? 'bg-green-50 border-green-200' :
          summary.status === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {summary.status === 'OK' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : summary.status === 'WARNING' ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <h2 className="text-xl font-semibold">
              Status: {summary.status}
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {summary.totalIssues} issues, {summary.totalWarnings} warnings, {summary.totalSuccess} checks passed
          </p>
        </div>

        {/* Redirect URIs */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Redirect URIs</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Calendar OAuth:</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                {redirectUris.calendar}
              </code>
              <p className="text-xs text-gray-500 mt-1">
                This must be added to Google Cloud Console → OAuth 2.0 Client ID → Authorized redirect URIs
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Login OAuth (Supabase):</p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all">
                {redirectUris.login}
              </code>
              <p className="text-xs text-gray-500 mt-1">
                This must be configured in Supabase Dashboard → Authentication → URL Configuration
              </p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-xs text-blue-800">
                <strong>Base URL:</strong> {redirectUris.baseUrl} {redirectUris.appUrlSet ? '(from NEXT_PUBLIC_APP_URL)' : '(from request origin)'}
              </p>
            </div>
          </div>
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-red-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Critical Issues ({issues.length})
            </h2>
            <div className="space-y-3">
              {issues.map((issue: any, idx: number) => (
                <Alert key={idx} variant="destructive">
                  <AlertTitle>{issue.type}</AlertTitle>
                  <AlertDescription>
                    <p className="font-semibold">{issue.message}</p>
                    {issue.impact && <p className="text-sm mt-1">Impact: {issue.impact}</p>}
                    {issue.preview && <p className="text-xs mt-1 text-gray-500">Preview: {issue.preview}</p>}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-yellow-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Warnings ({warnings.length})
            </h2>
            <div className="space-y-3">
              {warnings.map((warning: any, idx: number) => (
                <Alert key={idx} className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">{warning.type}</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    <p>{warning.message}</p>
                    {warning.suggestion && <p className="text-sm mt-1">{warning.suggestion}</p>}
                    {warning.redirectUri && (
                      <code className="text-xs bg-yellow-100 px-2 py-1 rounded block mt-2 break-all">
                        {warning.redirectUri}
                      </code>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Success */}
        {success.length > 0 && (
          <div className="bg-white rounded-md shadow-sm border border-green-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Configuration Found ({success.length})
            </h2>
            <div className="space-y-2">
              {success.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>{item.message}</span>
                  {item.preview && <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.preview}</code>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OAuth URL */}
        {calendarOAuthUrl && (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Test Calendar OAuth URL</h2>
            <p className="text-sm text-gray-600 mb-2">
              This is the URL that will be used when clicking "Connect Google Calendar":
            </p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all mb-4">
              {calendarOAuthUrl.url}
            </code>
            <Button
              onClick={() => window.open(calendarOAuthUrl.url, '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Test OAuth Flow
            </Button>
          </div>
        )}

        {/* Quick Fixes */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Fixes</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1">1. Check Environment Variables</p>
              <p className="text-gray-600">
                Make sure <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and{' '}
                <code className="bg-gray-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> are set in:
              </p>
              <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                <li>Local: <code className="bg-gray-100 px-1 rounded">.env.local</code></li>
                <li>Production: Vercel Dashboard → Settings → Environment Variables</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">2. Verify Redirect URIs in Google Cloud Console</p>
              <p className="text-gray-600 mb-2">
                Go to:{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline flex items-center gap-1"
                >
                  Google Cloud Console → APIs & Services → Credentials
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p className="text-gray-600">
                Make sure the redirect URI above is in the "Authorized redirect URIs" list for your OAuth Client ID.
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">3. Check Supabase Google Provider</p>
              <p className="text-gray-600">
                For login OAuth, make sure Google provider is enabled in Supabase Dashboard → Authentication → Providers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

