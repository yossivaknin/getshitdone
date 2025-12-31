'use client'

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Logo } from '@/components/logo';

interface BriefingData {
  readinessScore: number;
  headline: string;
  tacticalPoints: string[];
}

interface CockpitHeaderProps {
  tasks: any[];
}

export function CockpitHeader({ tasks }: CockpitHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cockpit_header_expanded');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [showIntelDetails, setShowIntelDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Detect mobile breakpoint
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        
        const accessToken = typeof window !== 'undefined' 
          ? localStorage.getItem('google_calendar_token')
          : null;
        
        const response = accessToken
          ? await fetch('/api/briefing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accessToken }),
            })
          : await fetch('/api/briefing');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch briefing: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        setBriefing(data);
      } catch (err: any) {
        console.error('[CockpitHeader] Error:', err);
        setError(err.message || 'UPLINK FAILED');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  // Calculate telemetry stats
  const telemetryStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const parseTaskDate = (dueDate: string): Date | null => {
      if (!dueDate) return null;
      try {
        const parsed = new Date(dueDate + 'T00:00:00');
        if (isNaN(parsed.getTime())) return null;
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      } catch {
        return null;
      }
    };

    const tasksToday = tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      return dueDate !== null && dueDate.getTime() === today.getTime();
    });

    const tasksThisWeek = tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      if (dueDate === null) return false;
      return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
    });

    const todayTimeBudget = tasksToday.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);
    const weekTimeBudget = tasksThisWeek.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);

    const formatDuration = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    };

    return {
      todayTasks: tasksToday.length,
      todayBudget: todayTimeBudget > 0 ? formatDuration(todayTimeBudget) : '0m',
      weekTasks: tasksThisWeek.length,
      weekBudget: weekTimeBudget > 0 ? formatDuration(weekTimeBudget) : '0m',
      activeTasks: tasks.filter((t: any) => t.list_id === 'in-progress').length,
      doneTasks: tasks.filter((t: any) => t.list_id === 'done').length,
    };
  }, [tasks]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cockpit_header_expanded', String(newState));
    }
  };

  return (
    <div className="w-full bg-slate-950 border-b border-emerald-500/20">
      {/* Collapsible Header Bar */}
      <button
        onClick={toggleExpanded}
        className="w-full px-4 sm:px-5 md:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors"
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <Logo />
          <div className="hidden sm:block h-5 w-px bg-emerald-500/20" />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 uppercase tracking-widest text-[10px] sm:text-xs font-semibold">
              System Online
            </span>
          </div>
          {briefing && !isLoading && !error && (
            <>
              <div className="hidden sm:block h-5 w-px bg-slate-800" />
              <div className="text-right">
                <div className="text-emerald-400/40 text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">Readiness</div>
                <div className="text-emerald-400 text-sm sm:text-base font-bold">{briefing.readinessScore}%</div>
              </div>
            </>
          )}
        </div>
        <div className="text-emerald-400/60 hover:text-emerald-400 transition-colors flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </div>
      </button>

      {/* Expanded Content - 3 Column Grid */}
      {isExpanded && (
        <div className="px-4 sm:px-5 md:px-6 lg:px-8 py-4 sm:py-5 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* Strategy Sector - Col 4 */}
            <div className="md:col-span-4 border-r-0 md:border-r border-slate-800 pr-0 md:pr-6">
              <div className="mb-2">
                <div className="text-emerald-400/50 text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">
                  Strategy
                </div>
                {isLoading && (
                  <div className="flex items-center gap-2 text-emerald-400/80 py-4">
                    <span className="text-xs">Establishing connection</span>
                    <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>_</span>
                  </div>
                )}
                {error && (
                  <div className="text-red-400/80 text-xs py-2">{error}</div>
                )}
                {briefing && !isLoading && !error && (
                  <>
                    <div className="text-emerald-400 text-4xl sm:text-5xl md:text-6xl font-bold mb-3">
                      {briefing.readinessScore}%
                    </div>
                    <div className="bg-slate-900/50 border-l-2 border-emerald-500/50 pl-3 py-2 rounded-sm">
                      <div className="text-white text-sm sm:text-base font-semibold leading-snug">
                        {briefing.headline}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Intel Sector - Col 5 */}
            <div className="md:col-span-5 border-r-0 md:border-r border-slate-800 pr-0 md:pr-6">
              <div className="mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-emerald-400/50 text-[9px] sm:text-[10px] uppercase tracking-widest">
                    Intel
                  </div>
                  {/* Mobile: Show Details Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowIntelDetails(!showIntelDetails);
                    }}
                    className="md:hidden text-emerald-400/60 hover:text-emerald-400 text-[10px] uppercase tracking-widest"
                  >
                    {showIntelDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
                {(!isMobile || showIntelDetails) && (
                  <>
                    {isLoading && (
                      <div className="text-emerald-400/60 text-xs py-2">Loading insights...</div>
                    )}
                    {error && (
                      <div className="text-red-400/60 text-xs py-2">{error}</div>
                    )}
                    {briefing && !isLoading && !error && (
                      <ul className="space-y-1.5 sm:space-y-2">
                        {briefing.tacticalPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-slate-400 text-xs font-mono leading-relaxed">
                            <span className="text-emerald-500/40 mt-0.5 flex-shrink-0">•</span>
                            <span className="flex-1">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                {isMobile && !showIntelDetails && (
                  <div className="text-slate-500 text-xs font-mono py-2">
                    Tap "Show Details" to view insights
                  </div>
                )}
              </div>
            </div>

            {/* Telemetry Sector - Col 3 */}
            <div className="md:col-span-3">
              <div className="mb-2">
                <div className="text-emerald-400/50 text-[9px] sm:text-[10px] uppercase tracking-widest mb-3">
                  Telemetry
                </div>
                <div className="space-y-2.5">
                  {/* Data Cells */}
                  <div className="bg-slate-900/30 border border-slate-800 rounded px-3 py-2">
                    <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Today</div>
                    <div className="text-emerald-400 text-base font-bold font-mono">{telemetryStats.todayTasks}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-0.5">Tasks</div>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded px-3 py-2">
                    <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Budget</div>
                    <div className="text-emerald-400 text-base font-bold font-mono">{telemetryStats.todayBudget}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-0.5">Time</div>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded px-3 py-2">
                    <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Week</div>
                    <div className="text-emerald-400 text-base font-bold font-mono">{telemetryStats.weekTasks}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-0.5">Tasks</div>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded px-3 py-2">
                    <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Week Budget</div>
                    <div className="text-emerald-400 text-base font-bold font-mono">{telemetryStats.weekBudget}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-0.5">Time</div>
                  </div>
                  <div className="bg-slate-900/30 border border-slate-800 rounded px-3 py-2">
                    <div className="text-slate-400 text-[10px] uppercase tracking-widest mb-1">Active</div>
                    <div className="text-emerald-400 text-base font-bold font-mono">{telemetryStats.activeTasks}</div>
                    <div className="text-slate-500 text-[10px] font-mono mt-0.5">In Progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

