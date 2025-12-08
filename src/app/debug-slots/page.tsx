'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function DebugSlotsPage() {
  const [date, setDate] = useState('2024-12-06') // Friday 12/6 (assuming 2024)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokenFound, setTokenFound] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [manualToken, setManualToken] = useState('')
  const [useManualToken, setUseManualToken] = useState(false)
  
  useEffect(() => {
    // Check if token exists on mount
    if (typeof window !== 'undefined') {
      const checkToken = () => {
        const token = localStorage.getItem('google_calendar_token')
        setTokenFound(!!token)
        
        // Collect debug info
        if (!token) {
          const allKeys = Object.keys(localStorage)
          const relevantKeys = allKeys.filter(k => 
            k.toLowerCase().includes('google') || 
            k.toLowerCase().includes('calendar') ||
            k.toLowerCase().includes('token')
          )
          setDebugInfo(`LocalStorage keys found: ${allKeys.length}. Relevant keys: ${relevantKeys.join(', ') || 'none'}`)
          console.log('[DEBUG] All localStorage keys:', allKeys)
          console.log('[DEBUG] Relevant keys:', relevantKeys)
        } else {
          setDebugInfo('Token found!')
        }
      }
      
      checkToken()
      // Also check after a short delay in case token is set asynchronously
      const timer = setTimeout(checkToken, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleTest = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Get token - either from manual input or localStorage
      let accessToken: string | null = null
      
      if (useManualToken && manualToken.trim()) {
        accessToken = manualToken.trim()
      } else {
        // Try multiple ways to get the token
        accessToken = localStorage.getItem('google_calendar_token')
        
        // If not found, try to get from sessionStorage or check if we're in the right context
        if (!accessToken && typeof window !== 'undefined') {
          // Check all possible storage locations
          accessToken = sessionStorage.getItem('google_calendar_token') || 
                       localStorage.getItem('google_calendar_access_token') ||
                       null
        }
      }
      
      const workingHoursStart = localStorage.getItem('workingHoursStart') || localStorage.getItem('working_hours_start') || '09:00'
      const workingHoursEnd = localStorage.getItem('workingHoursEnd') || localStorage.getItem('working_hours_end') || '18:00'

      if (!accessToken) {
        setError('Google Calendar token is required. Please either connect Google Calendar in Settings, or paste your access token manually below.')
        setLoading(false)
        return
      }

      const url = new URL('/api/debug-slots', window.location.origin)
      url.searchParams.set('date', date)
      url.searchParams.set('token', accessToken)
      url.searchParams.set('workingHoursStart', workingHoursStart)
      url.searchParams.set('workingHoursEnd', workingHoursEnd)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to fetch slots'
        const details = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : ''
        setError(errorMsg + details)
        console.error('[DEBUG] API Error:', data)
      } else {
        setResult(data)
        console.log('[DEBUG] Success!', data)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to test')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Debug Available Slots</h1>
        
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="date">Date (YYYY-MM-DD)</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            {!tokenFound && (
              <div className="border border-gray-300 rounded p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="useManualToken"
                    checked={useManualToken}
                    onChange={(e) => setUseManualToken(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="useManualToken" className="text-sm font-semibold">
                    Use manual token (paste from browser console)
                  </Label>
                </div>
                {useManualToken && (
                  <div className="mt-2">
                    <Label htmlFor="manualToken" className="text-xs text-gray-600">
                      Google Calendar Access Token
                    </Label>
                    <Input
                      id="manualToken"
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Paste your access token here..."
                      className="mt-1 text-xs font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      To get your token: Open browser console, type: <code className="bg-gray-200 px-1 rounded">localStorage.getItem('google_calendar_token')</code>
                    </p>
                  </div>
                )}
              </div>
            )}
            <Button onClick={handleTest} disabled={loading || (!tokenFound && !useManualToken)}>
              {loading ? 'Loading...' : 'Check Available Slots'}
            </Button>
            {debugInfo && (
              <p className="text-xs text-gray-500 mt-2">{debugInfo}</p>
            )}
          </div>
        </div>

        {!tokenFound && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-yellow-800 font-semibold">⚠️ Google Calendar Token Not Found</p>
            <p className="text-yellow-700 text-sm mt-2">
              Please make sure you are logged in and have connected Google Calendar in{' '}
              <Link href="/settings" className="underline font-semibold">Settings</Link>.
            </p>
            <p className="text-yellow-700 text-sm mt-2">
              If you have connected Google Calendar but still see this message, try:
            </p>
            <ul className="text-yellow-700 text-sm mt-2 list-disc list-inside">
              <li>Refreshing the page</li>
              <li>Reconnecting Google Calendar in Settings</li>
              <li>Checking the browser console for any errors</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800 font-semibold">Error:</p>
            <p className="text-red-600">{error}</p>
            {error.includes('token') && (
              <div className="mt-3">
                <Link href="/settings" className="text-blue-600 underline">
                  Go to Settings to connect Google Calendar
                </Link>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Busy Slots</h2>
              <p className="text-sm text-gray-600 mb-4">
                Working Hours: {result.workingHours.start} - {result.workingHours.end}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Total Busy Slots: {result.busySlots.total} 
                ({result.busySlots.fromFreeBusy} from FreeBusy API, {result.busySlots.fromFocusEvents} from [Focus] events)
              </p>
              
              {result.busySlots.total === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                  <p className="text-yellow-800 font-semibold">⚠️ WARNING: No busy slots found!</p>
                  <p className="text-yellow-700 text-sm mt-2">
                    This means the FreeBusy API is not returning any busy periods. 
                    Conflict detection will NOT work!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.busySlots.slots.map((slot: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{slot.summary || 'External Meeting'}</p>
                          <p className="text-xs text-gray-600">{slot.startLocal} - {slot.endLocal}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {slot.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Free Slots (30 minutes)</h2>
              {result.freeSlots['30min'].length === 0 ? (
                <p className="text-gray-600">No free 30-minute slots found</p>
              ) : (
                <div className="space-y-2">
                  {result.freeSlots['30min'].map((slot: any, idx: number) => (
                    <div key={idx} className="border border-green-200 rounded p-3 bg-green-50">
                      <p className="font-semibold text-sm text-green-800">
                        {slot.startLocal} - {slot.endLocal}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4">Free Slots (60 minutes)</h2>
              {result.freeSlots['60min'].length === 0 ? (
                <p className="text-gray-600">No free 60-minute slots found</p>
              ) : (
                <div className="space-y-2">
                  {result.freeSlots['60min'].map((slot: any, idx: number) => (
                    <div key={idx} className="border border-green-200 rounded p-3 bg-green-50">
                      <p className="font-semibold text-sm text-green-800">
                        {slot.startLocal} - {slot.endLocal}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

