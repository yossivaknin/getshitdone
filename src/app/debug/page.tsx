'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [pending, setPending] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)
  const [lastAttempt, setLastAttempt] = useState<string | null>(null)

  useEffect(() => {
    try {
      setPending(localStorage.getItem('pendingDeepLink'))
      setLastError(localStorage.getItem('lastAuthError'))
      setLastSuccess(localStorage.getItem('lastAuthSuccess'))
      setLastAttempt(localStorage.getItem('lastExchangeAttempt'))
    } catch (e) {
      console.error('Could not read debug localStorage keys', e)
    }

    function onStorage() {
      try {
        setPending(localStorage.getItem('pendingDeepLink'))
        setLastError(localStorage.getItem('lastAuthError'))
        setLastSuccess(localStorage.getItem('lastAuthSuccess'))
        setLastAttempt(localStorage.getItem('lastExchangeAttempt'))
      } catch (e) { console.error(e) }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('capacitorError', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('capacitorError', onStorage)
    }
  }, [])

  function retry() {
    try {
      const pending = localStorage.getItem('pendingDeepLink')
      if (!pending) return alert('No pending deep link')
      // Trigger retry event that CapacitorInit listens for
      window.dispatchEvent(new Event('retryDeepLink'))
      alert('Retry triggered — check logs')
    } catch (e) {
      console.error('Retry failed', e)
      alert('Retry failed: ' + String(e))
    }
  }

  function clearAll() {
    try {
      localStorage.removeItem('pendingDeepLink')
      localStorage.removeItem('lastAuthError')
      localStorage.removeItem('lastAuthSuccess')
      localStorage.removeItem('lastExchangeAttempt')
      setPending(null)
      setLastError(null)
      setLastSuccess(null)
      setLastAttempt(null)
    } catch (e) {
      console.error('Clear failed', e)
      alert('Clear failed: ' + String(e))
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-slate-900 bg-white rounded-lg shadow-lg mt-8">
      <h1 className="text-2xl font-semibold mb-4">⚙️ OAuth Debug</h1>

      <div className="mb-4">
        <strong>Pending Deep Link:</strong>
        <pre className="bg-slate-100 p-2 rounded mt-2 break-words">{pending || '— none —'}</pre>
      </div>

      <div className="mb-4">
        <strong>Last Exchange Attempt:</strong>
        <pre className="bg-slate-100 p-2 rounded mt-2 break-words">{lastAttempt || '— none —'}</pre>
      </div>

      <div className="mb-4">
        <strong>Last Auth Error:</strong>
        <pre className="bg-red-50 text-red-800 p-2 rounded mt-2 break-words">{lastError || '— none —'}</pre>
      </div>

      <div className="mb-4">
        <strong>Last Auth Success:</strong>
        <pre className="bg-green-50 text-green-800 p-2 rounded mt-2 break-words">{lastSuccess || '— none —'}</pre>
      </div>

      <div className="flex gap-3">
        <button onClick={retry} className="px-4 py-2 bg-blue-600 text-white rounded">Retry Exchange</button>
        <button onClick={() => { window.location.href = '/login' }} className="px-4 py-2 bg-gray-200 rounded">Go to Login</button>
        <button onClick={clearAll} className="px-4 py-2 bg-red-500 text-white rounded">Clear</button>
      </div>

      <p className="mt-4 text-sm text-slate-600">Open Xcode logs and check for lines prefixed with [Capacitor] after triggering actions.</p>
    </div>
  )
}
