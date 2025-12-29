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
        
        console.log('[MorningBriefing] Fetching briefing from /api/briefing...');
        const response = await fetch('/api/briefing');
        
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
    <div className="bg-slate-950 border-2 border-emerald-500/30 rounded-sm p-4 font-mono text-sm min-h-[200px] w-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 uppercase tracking-widest text-xs font-bold">
            SITREP // DAILY STRATEGY
          </span>
          {!isLoading && !error && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-500/70 text-[10px] uppercase">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="text-emerald-400/80">
          <span>ESTABLISHING UPLINK</span>
          <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>_</span>
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <div className="text-red-400 uppercase tracking-wider font-bold">
            {error}
          </div>
          <div className="text-red-400/70 text-xs">
            Check browser console for details. Make sure GOOGLE_GEMINI_API_KEY is set in Vercel.
          </div>
        </div>
      )}

      {briefing && !isLoading && !error && (
        <div className="space-y-4">
          {/* Readiness Score */}
          <div>
            <div className="text-emerald-400/60 text-xs uppercase tracking-widest mb-1">
              STATUS
            </div>
            <div className="text-emerald-400 text-2xl font-bold">
              {briefing.readinessScore}% OPERATIONAL
            </div>
          </div>

          {/* Headline */}
          <div>
            <div className="text-emerald-400/60 text-xs uppercase tracking-widest mb-1">
              HEADLINE
            </div>
            <div className="text-white text-base font-semibold">
              {briefing.headline}
            </div>
          </div>

          {/* Tactical Points */}
          <div>
            <div className="text-emerald-400/60 text-xs uppercase tracking-widest mb-2">
              TACTICAL LOG
            </div>
            <ul className="space-y-1.5">
              {briefing.tacticalPoints.map((point, idx) => (
                <li key={idx} className="text-emerald-300/90 text-xs leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

