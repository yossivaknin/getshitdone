'use client'

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Logo } from '@/components/logo';

interface BriefingData {
  readinessScore: number;
  headline: string;
  tacticalPoints: string[];
}

export function SitrepWidget() {
  // Load expanded state from localStorage (default to true)
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sitrep_widget_expanded');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Save expanded state to localStorage
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sitrep_widget_expanded', String(newState));
    }
  };

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
        
        console.log('[SitrepWidget] Fetching briefing from /api/briefing...');
        console.log('[SitrepWidget] Has calendar token:', !!accessToken);
        
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
        
        console.log('[SitrepWidget] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[SitrepWidget] API error:', errorText);
          throw new Error(`Failed to fetch briefing: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('[SitrepWidget] Received briefing data:', data);
        setBriefing(data);
      } catch (err: any) {
        console.error('[SitrepWidget] Error:', err);
        setError(err.message || 'UPLINK FAILED');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/20 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300">
      {/* Collapsible Header */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Logo />
          <div className="hidden sm:block h-5 w-px bg-emerald-500/20" />
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
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
        </div>
        <div className="flex items-center gap-3">
          {briefing && !isLoading && !error && (
            <div className="text-right">
              <div className="text-emerald-400/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">Readiness</div>
              <div className="text-emerald-400 text-sm sm:text-lg font-bold">{briefing.readinessScore}%</div>
            </div>
          )}
          <div className="text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-emerald-500/10">
          {/* Content */}
          {isLoading && (
            <div className="flex items-center gap-2 text-emerald-400/80 py-6">
              <span className="text-xs sm:text-sm">Establishing connection</span>
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
      )}
    </div>
  );
}

