'use client'

import { useState, useEffect } from 'react';

interface BriefingData {
  readinessScore: number;
  headline: string;
  tacticalPoints: string[];
}

export function MorningBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCursorVisible(prev => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get Google Calendar access token from localStorage (if available)
        const accessToken = typeof window !== 'undefined' 
          ? localStorage.getItem('google_calendar_token')
          : null;
        
        console.log('[MorningBriefing] Fetching briefing from /api/briefing...');
        console.log('[MorningBriefing] Has calendar token:', !!accessToken);
        
        // Use POST to send token if available, otherwise GET
        const response = accessToken
          ? await fetch('/api/briefing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accessToken }),
            })
          : await fetch('/api/briefing');
        
        console.log('[MorningBriefing] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[MorningBriefing] API error:', errorText);
          throw new Error(`Failed to fetch briefing: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('[MorningBriefing] Received briefing data:', data);
        setBriefing(data);
      } catch (err: any) {
        console.error('[MorningBriefing] Error:', err);
        setError(err.message || 'UPLINK FAILED');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  // Always render the component, even if there's an error
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/20 rounded-lg p-4 sm:p-5 font-mono text-sm w-full shadow-lg backdrop-blur-sm">
      {/* Unified Header with Status Indicator */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-500/10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 uppercase tracking-widest text-[10px] sm:text-xs font-semibold">
              Daily Strategy
            </span>
          </div>
          {!isLoading && !error && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-emerald-400 text-[9px] sm:text-[10px] uppercase font-medium">Live</span>
            </div>
          )}
        </div>
        {briefing && !isLoading && !error && (
          <div className="text-right">
            <div className="text-emerald-400/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">Readiness</div>
            <div className="text-emerald-400 text-base sm:text-lg font-bold">{briefing.readinessScore}%</div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center gap-2 text-emerald-400/80 py-8">
          <span>Establishing connection</span>
          <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>_</span>
        </div>
      )}

      {error && (
        <div className="space-y-2 py-4">
          <div className="text-red-400 uppercase tracking-wider text-xs font-semibold">
            Connection Failed
          </div>
          <div className="text-red-400/60 text-[10px] leading-relaxed">
            {error}
          </div>
        </div>
      )}

      {briefing && !isLoading && !error && (
        <div className="space-y-3.5">
          {/* Headline - Prominent */}
          <div className="bg-slate-800/40 border-l-2 border-emerald-500/50 pl-3 py-2 rounded-sm">
            <div className="text-white text-xs sm:text-sm font-semibold leading-snug">
              {briefing.headline}
            </div>
          </div>

          {/* Insights - Clean List */}
          <div>
            <div className="text-emerald-400/50 text-[9px] sm:text-[10px] uppercase tracking-widest mb-2">
              Key Insights
            </div>
            <ul className="space-y-1.5 sm:space-y-2">
              {briefing.tacticalPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-emerald-300/80 text-[11px] sm:text-xs leading-relaxed">
                  <span className="text-emerald-500/40 mt-0.5 flex-shrink-0">•</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

